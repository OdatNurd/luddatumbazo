import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { marked } from 'marked';
import { parse } from 'node-html-parser';

import {
  gameDescriptionToMarkdown,
  isDescriptionConversionCandidate,
  descriptionEntityTokens,
  decodeDescriptionEntities
} from '../service/src/lib/descriptionMarkdown.js';


/******************************************************************************/


/* One-time normalization of Game.description to Markdown.
 *
 * This tool is deliberately not part of the Worker request path. It exports the
 * current descriptions, converts them with the same implementation used by BGG
 * imports, writes reviewable SQL and an undo file, and can apply/verify the
 * migration against local or remote D1.
 *
 * Usage:
 *   node tools/gameDescriptionsMarkdown.js export [--local|--remote]
 *   node tools/gameDescriptionsMarkdown.js convert [--local|--remote]
 *   node tools/gameDescriptionsMarkdown.js review
 *   node tools/gameDescriptionsMarkdown.js apply [--local|--remote]
 *   node tools/gameDescriptionsMarkdown.js verify [--local|--remote]
 *   node tools/gameDescriptionsMarkdown.js migrate [--local|--remote]
 *
 * Outputs live in dump/ and are gitignored: the source/after data, SQL, undo,
 * report, verification, and the static review page. */


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DUMP = path.join(ROOT, 'dump');
const DB_NAME = 'luddatumbazo';

const BEFORE_PATH = path.join(DUMP, 'game-descriptions-before.json');
const AFTER_PATH = path.join(DUMP, 'game-descriptions-after.json');
const REPORT_PATH = path.join(DUMP, 'game-descriptions-report.json');
const REVIEW_PATH = path.join(DUMP, 'game-descriptions-review.html');
const SQL_PATH = path.join(DUMP, 'game-descriptions-migration.sql');
const UNDO_PATH = path.join(DUMP, 'game-descriptions-undo.sql');
const VERIFY_PATH = path.join(DUMP, 'game-descriptions-verification.json');


/******************************************************************************/


/* Make sure the gitignored output directory exists. */
function ensureDump() {
  fs.mkdirSync(DUMP, { recursive: true });
}


/******************************************************************************/


/* Read the database selector from the command line; local is the default. */
function sourceFromArgs(args) {
  if (args.includes('--remote')) {
    return 'remote';
  }

  return 'local';
}


/******************************************************************************/


/* Run wrangler with the given arguments and return its standard output. */
function runWrangler(args) {
  return execFileSync('pnpm', ['exec', 'wrangler', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}


/******************************************************************************/


/* Read the id, slug and description of every game from the selected database. */
function queryDescriptions(source) {
  const command = 'SELECT id, slug, description FROM Game ORDER BY id';
  const args = [
    'd1', 'execute', DB_NAME,
    source === 'remote' ? '--remote' : '--local',
    '--yes', '--json', '--command', command
  ];

  const output = runWrangler(args);
  const start = output.indexOf('[');
  const end = output.lastIndexOf(']');

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`could not parse wrangler D1 output:\n${output.slice(0, 1000)}`);
  }

  const payload = JSON.parse(output.slice(start, end + 1));
  const results = Array.isArray(payload)
    ? payload.flatMap(entry => entry.results ?? [])
    : [];

  return results.map(row => ({
    id: Number(row.id),
    slug: String(row.slug ?? ''),
    description: String(row.description ?? '')
  }));
}


/******************************************************************************/


/* Write a value as pretty-printed JSON with a trailing newline. */
function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}


/******************************************************************************/


/* Quote a value as a single-quoted SQL string literal. */
function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}


/******************************************************************************/


/* Write the forward migration and its undo, one statement per changed row. */
function writeSql(rows) {
  const changed = rows.filter(row => row.changed);

  const updates = changed.length === 0
    ? ['-- No descriptions required conversion.']
    : changed.map(row => `UPDATE Game SET description = ${sqlString(row.after)} WHERE id = ${row.id};`);

  const undos = changed.length === 0
    ? ['-- Nothing to undo.']
    : changed.map(row => `UPDATE Game SET description = ${sqlString(row.before)} WHERE id = ${row.id};`);

  fs.writeFileSync(SQL_PATH, [
    '-- Generated by tools/gameDescriptionsMarkdown.js',
    `-- ${new Date().toISOString()}`,
    '-- Only Game.description is modified.',
    '',
    ...updates,
    ''
  ].join('\n'), 'utf8');

  fs.writeFileSync(UNDO_PATH, [
    '-- Undo for tools/gameDescriptionsMarkdown.js',
    `-- ${new Date().toISOString()}`,
    '-- Restores the original Game.description values.',
    '',
    ...undos,
    ''
  ].join('\n'), 'utf8');
}


/******************************************************************************/


/* Reduce text to its visible characters so the audit can detect prose loss
 * without being fooled by formatting differences. */
function normalizeForComparison(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '')
    .trim();
}


/******************************************************************************/


/* Extract visible text from a source description, skipping the elements the
 * converter intentionally removes. This is used only to flag accidental prose
 * loss in the migration report. */
function sourceText(node) {
  if (node?.nodeType === 3) {
    return decodeDescriptionEntities(node.rawText ?? node.textContent ?? '');
  }

  if (node?.nodeType !== 1) {
    return '';
  }

  const tag = String(node.rawTagName ?? '').toLowerCase();
  if (['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'img'].includes(tag)) {
    return '';
  }

  if (tag === 'br') {
    return ' ';
  }

  return (node.childNodes ?? []).map(sourceText).join(' ');
}


/******************************************************************************/


/* Extract the visible text from an original stored description. */
function sourceToText(source) {
  if (isDescriptionConversionCandidate(source)) {
    try {
      return sourceText(parse(source, { comment: false }));
    }
    catch {
      return decodeDescriptionEntities(source);
    }
  }

  return decodeDescriptionEntities(source);
}


/******************************************************************************/


/* Render Markdown back to visible text for comparison with the source. */
function markdownToText(source) {
  const html = marked.parse(String(source ?? ''), { gfm: true, breaks: true });
  return decodeDescriptionEntities(html.replace(/<[^>]*>/g, ' '));
}


/******************************************************************************/


/* Whether a stored value still contains something that looks like an active
 * HTML tag. */
function hasResidualHtml(source) {
  // Code fences are literal content, not active HTML. Remove them before the
  // residual-tag check so a code sample containing <tag> is not a false alarm.
  const withoutCode = String(source ?? '').replace(/```[\s\S]*?```/g, '');
  return /<\/?[a-z][^>]*>/i.test(withoutCode.replace(/\\</g, ''));
}


/******************************************************************************/


/* Count every entity token before and after conversion for the report. */
function collectEntityInventory(rows) {
  const before = {};
  const after = {};

  for (const row of rows) {
    for (const token of descriptionEntityTokens(row.before)) {
      before[token] = (before[token] ?? 0) + 1;
    }

    for (const token of descriptionEntityTokens(row.after)) {
      after[token] = (after[token] ?? 0) + 1;
    }
  }

  return { before, after };
}


/******************************************************************************/


/* Convert each exported row and collect the audit data for the report. */
function buildRows(sourceRows) {
  return sourceRows.map(row => {
    const before = row.description;
    const candidate = isDescriptionConversionCandidate(before);
    const after = candidate ? gameDescriptionToMarkdown(before) : before;
    const changed = candidate && after !== before;
    const beforeText = normalizeForComparison(sourceToText(before));
    const afterText = normalizeForComparison(markdownToText(after));

    return {
      id: row.id,
      slug: row.slug,
      before,
      after,
      changed,
      candidate,
      empty: before.trim() === '',
      status: changed ? 'converted' : (candidate ? 'unchanged-candidate' : 'skipped'),
      residualHtml: hasResidualHtml(after),
      beforeLength: before.length,
      afterLength: after.length,
      textMatches: beforeText === afterText,
      beforeTextLength: beforeText.length,
      afterTextLength: afterText.length,
      entitiesBefore: descriptionEntityTokens(before),
      entitiesAfter: descriptionEntityTokens(after)
    };
  });
}


/******************************************************************************/


/* Export the selected database's descriptions to the before file. */
function exportDescriptions(source) {
  ensureDump();
  const rows = queryDescriptions(source);
  const payload = {
    kind: 'game-description-export',
    source,
    exportedAt: new Date().toISOString(),
    count: rows.length,
    rows
  };

  writeJson(BEFORE_PATH, payload);
  console.log(`exported ${rows.length} descriptions from ${source} to ${path.relative(ROOT, BEFORE_PATH)}`);
  return rows;
}


/******************************************************************************/


/* Convert the exported descriptions and write the after data, report, SQL and
 * undo files. */
function convertExport(source) {
  ensureDump();
  let sourceRows;

  if (fs.existsSync(BEFORE_PATH)) {
    const payload = JSON.parse(fs.readFileSync(BEFORE_PATH, 'utf8'));
    if (payload.source !== source) {
      throw new Error(`existing export is for ${payload.source}, not ${source}; run export --${source} first`);
    }
    sourceRows = (payload.rows ?? []).map(row => ({
      id: Number(row.id),
      slug: String(row.slug ?? ''),
      description: String(row.description ?? '')
    }));
  }
  else {
    sourceRows = exportDescriptions(source);
  }

  const rows = buildRows(sourceRows);
  const inventory = collectEntityInventory(rows);
  const counts = {
    total: rows.length,
    converted: rows.filter(row => row.changed).length,
    unchangedCandidates: rows.filter(row => row.candidate && !row.changed).length,
    skipped: rows.filter(row => !row.candidate).length,
    empty: rows.filter(row => row.empty).length,
    residualHtml: rows.filter(row => row.residualHtml).length,
    textMismatches: rows.filter(row => !row.textMatches && !row.empty).length,
    entityRows: rows.filter(row => row.entitiesBefore.length > 0).length,
    unresolvedEntityRows: rows.filter(row => row.entitiesAfter.length > 0).length
  };

  const afterPayload = {
    kind: 'game-description-conversion',
    source,
    convertedAt: new Date().toISOString(),
    count: rows.length,
    rows: rows.map(row => ({
      id: row.id,
      slug: row.slug,
      before: row.before,
      after: row.after,
      changed: row.changed,
      candidate: row.candidate,
      status: row.status,
      residualHtml: row.residualHtml,
      textMatches: row.textMatches
    }))
  };

  const report = {
    kind: 'game-description-conversion-report',
    source,
    generatedAt: new Date().toISOString(),
    counts,
    entities: inventory,
    rows: rows.map(row => ({
      id: row.id,
      slug: row.slug,
      status: row.status,
      changed: row.changed,
      empty: row.empty,
      beforeLength: row.beforeLength,
      afterLength: row.afterLength,
      textMatches: row.textMatches,
      residualHtml: row.residualHtml,
      entitiesBefore: row.entitiesBefore,
      entitiesAfter: row.entitiesAfter
    }))
  };

  writeJson(AFTER_PATH, afterPayload);
  writeJson(REPORT_PATH, report);
  writeSql(rows);

  console.log(JSON.stringify(counts, null, 2));
  console.log(`wrote ${path.relative(ROOT, AFTER_PATH)}`);
  console.log(`wrote ${path.relative(ROOT, SQL_PATH)}`);
  console.log(`wrote ${path.relative(ROOT, UNDO_PATH)}`);
  console.log(`wrote ${path.relative(ROOT, REPORT_PATH)}`);

  return rows;
}


/******************************************************************************/


/* Escape a value for safe inclusion in the local review page. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/******************************************************************************/


const REVIEW_TAGS = new Set([
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'hr', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody',
  'td', 'th', 'thead', 'tr', 'ul'
]);


/* Marked is safe here because the converter escapes literal HTML and only
 * emits the tags Markdown itself generates. Keep a narrow sanitizer anyway so
 * the local review page cannot execute anything from a bad stored row. */
function sanitizeReviewHtml(html) {
  return String(html).replace(/<\/?([a-z][a-z0-9]*)([^>]*)>/gi, (full, tag, attrs) => {
    const name = tag.toLowerCase();
    if (!REVIEW_TAGS.has(name)) {
      return '';
    }

    if (name !== 'a') {
      return full.startsWith('</') ? `</${name}>` : `<${name}>`;
    }

    const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '';
    const safe = /^(?:https?:|mailto:|#)/i.test(href) && !/[\s"'<>]/.test(href);
    return full.startsWith('</')
      ? '</a>'
      : (safe ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">` : '<a>');
  });
}


/******************************************************************************/


/* Render Markdown for the review page through the narrow sanitizer. */
function renderReviewMarkdown(source) {
  return sanitizeReviewHtml(marked.parse(String(source ?? ''), { gfm: true, breaks: true }));
}


/******************************************************************************/


/* Write the static review page from the converted data. */
function generateReview() {
  ensureDump();
  if (!fs.existsSync(AFTER_PATH)) {
    throw new Error('conversion output is missing; run convert first');
  }

  const payload = JSON.parse(fs.readFileSync(AFTER_PATH, 'utf8'));
  const rows = payload.rows ?? [];
  const changed = rows.filter(row => row.changed).length;
  const skipped = rows.filter(row => !row.candidate).length;

  const body = rows.map(row => {
    const before = escapeHtml(row.before);
    const after = escapeHtml(row.after);
    const preview = renderReviewMarkdown(row.after);
    const status = row.changed ? 'converted' : (row.candidate ? 'unchanged' : 'skipped');

    return `
      <article class="row ${status}" data-name="${escapeHtml(row.slug)}">
        <header>
          <h2>${escapeHtml(row.slug)}</h2>
          <span class="badge ${status}">${status}</span>
          <span class="lengths">${row.before.length.toLocaleString()} → ${row.after.length.toLocaleString()} chars</span>
        </header>
        <div class="columns">
          <section>
            <h3>Original stored value</h3>
            <pre class="source">${before}</pre>
          </section>
          <section>
            <h3>Converted Markdown</h3>
            <pre class="source">${after}</pre>
            <h3>Rendered preview</h3>
            <div class="preview markdown-body">${preview}</div>
          </section>
        </div>
      </article>`;
  }).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Game Description Markdown Review</title>
  <style>
    :root { color-scheme: light; --ink:#202124; --muted:#5f6368; --line:#dadce0; --bg:#f8f9fa; --panel:#fff; --brand:#6750a4; --good:#146c2e; --warn:#8a4b00; }
    * { box-sizing: border-box; }
    body { margin:0; padding:32px; background:var(--bg); color:var(--ink); font:15px/1.55 system-ui, sans-serif; }
    header.page { max-width:1500px; margin:0 auto 24px; }
    h1 { margin:0 0 8px; font-size:1.8rem; }
    .intro { color:var(--muted); margin:0; }
    .summary { display:flex; gap:12px; flex-wrap:wrap; margin-top:18px; }
    .summary span { background:var(--panel); border:1px solid var(--line); border-radius:999px; padding:5px 12px; }
    .tools { margin:20px 0; display:flex; gap:10px; flex-wrap:wrap; }
    .tools input { min-width:320px; padding:8px 12px; border:1px solid var(--line); border-radius:8px; font:inherit; }
    .tools button { padding:8px 12px; border:1px solid var(--line); border-radius:8px; background:var(--panel); font:inherit; cursor:pointer; }
    .row { max-width:1500px; margin:0 auto 18px; background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
    .row > header { display:flex; align-items:center; gap:12px; padding:12px 18px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
    h2 { margin:0; font-size:1.05rem; flex:1; }
    h3 { margin:18px 0 8px; font-size:.78rem; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
    .badge { border-radius:999px; padding:3px 9px; font-size:.76rem; font-weight:700; text-transform:uppercase; }
    .badge.converted { background:#e7f4ea; color:var(--good); }
    .badge.skipped, .badge.unchanged { background:#f1f3f4; color:var(--muted); }
    .lengths { color:var(--muted); font-size:.84rem; }
    .columns { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:18px; padding:0 18px 18px; }
    .source { margin:0; padding:12px; max-height:260px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; background:#f6f8fa; border:1px solid var(--line); border-radius:8px; font:12px/1.5 ui-monospace, monospace; }
    .preview { max-height:360px; overflow:auto; padding:12px 16px; border:1px solid var(--line); border-radius:8px; }
    .preview p { margin:0 0 1em; } .preview :first-child { margin-top:0; } .preview :last-child { margin-bottom:0; }
    .preview ul,.preview ol { margin:0 0 1em; padding-left:1.75em; } .preview blockquote { margin:0 0 1em; padding-left:1em; border-left:3px solid var(--line); color:var(--muted); }
    .preview code { padding:.1em .3em; border-radius:4px; background:#f1f3f4; font-family:ui-monospace,monospace; } .preview pre { padding:12px; background:#f1f3f4; border-radius:8px; overflow:auto; }
    .preview table { border-collapse:collapse; } .preview th,.preview td { padding:4px 8px; border:1px solid var(--line); text-align:left; }
    .hidden { display:none; }
    @media (max-width:900px) { body { padding:18px; } .columns { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <header class="page">
    <h1>Game Description Markdown Review</h1>
    <p class="intro">Generated from <code>${escapeHtml(payload.source ?? 'local')}</code> at ${escapeHtml(payload.convertedAt ?? '')}. This file is local-only and is not deployed.</p>
    <div class="summary">
      <span>${rows.length} games</span><span>${changed} converted</span><span>${skipped} skipped</span>
    </div>
    <div class="tools">
      <input id="filter" type="search" placeholder="Filter by slug…" autocomplete="off">
      <button id="show-all" type="button">Show all</button>
      <button id="show-converted" type="button">Converted only</button>
    </div>
  </header>
  ${body}
  <script>
    const rows = [...document.querySelectorAll('.row')];
    const filter = document.querySelector('#filter');
    const apply = () => {
      const query = filter.value.trim().toLowerCase();
      rows.forEach(row => row.classList.toggle('hidden', query !== '' && !row.dataset.name.includes(query)));
    };
    filter.addEventListener('input', apply);
    document.querySelector('#show-all').addEventListener('click', () => { filter.value = ''; apply(); });
    document.querySelector('#show-converted').addEventListener('click', () => {
      filter.value = ''; rows.forEach(row => row.classList.toggle('hidden', !row.classList.contains('converted')));
    });
  </script>
</body>
</html>
`;

  fs.writeFileSync(REVIEW_PATH, html, 'utf8');
  console.log(`wrote ${path.relative(ROOT, REVIEW_PATH)}`);
}


/******************************************************************************/


/* Apply the generated migration SQL to the selected database. */
function applyMigration(source) {
  ensureDump();
  if (!fs.existsSync(SQL_PATH)) {
    throw new Error('migration SQL is missing; run convert first');
  }

  runWrangler([
    'd1', 'execute', DB_NAME,
    source === 'remote' ? '--remote' : '--local',
    '--yes', '--file', SQL_PATH
  ]);
  console.log(`applied ${path.relative(ROOT, SQL_PATH)} to ${source}`);
}


/******************************************************************************/


/* Compare the selected database with the converted output and write a
 * verification report. */
function verifyMigration(source) {
  if (!fs.existsSync(AFTER_PATH)) {
    throw new Error('conversion output is missing; run convert first');
  }

  const expected = JSON.parse(fs.readFileSync(AFTER_PATH, 'utf8'));
  const expectedById = new Map((expected.rows ?? []).map(row => [Number(row.id), row]));
  const current = queryDescriptions(source);
  const issues = [];

  for (const row of current) {
    const wanted = expectedById.get(row.id);
    if (wanted === undefined) {
      issues.push({ id: row.id, slug: row.slug, issue: 'database row is not in the expected export' });
      continue;
    }

    if (row.description !== wanted.after) {
      issues.push({
        id: row.id,
        slug: row.slug,
        issue: 'description differs from converted output',
        actualLength: row.description.length,
        expectedLength: wanted.after.length
      });
    }

    if (hasResidualHtml(row.description)) {
      issues.push({ id: row.id, slug: row.slug, issue: 'residual HTML tag in stored description' });
    }
  }

  if (current.length !== expectedById.size) {
    issues.push({
      issue: 'row count differs from the expected export',
      actual: current.length,
      expected: expectedById.size
    });
  }

  const result = {
    kind: 'game-description-verification',
    source,
    verifiedAt: new Date().toISOString(),
    total: current.length,
    issues
  };

  writeJson(VERIFY_PATH, result);
  console.log(JSON.stringify(result, null, 2));
  if (issues.length > 0) {
    process.exitCode = 1;
  }
}


/******************************************************************************/


/* Dispatch the command line action. */
async function main() {
  const args = process.argv.slice(2);
  const command = args.find(arg => !arg.startsWith('-')) ?? 'migrate';
  const source = sourceFromArgs(args);

  switch (command) {
    case 'export':
      exportDescriptions(source);
      break;

    case 'convert':
      convertExport(source);
      break;

    case 'review':
      generateReview();
      break;

    case 'apply':
      applyMigration(source);
      break;

    case 'verify':
      verifyMigration(source);
      break;

    case 'migrate':
      exportDescriptions(source);
      convertExport(source);
      generateReview();
      applyMigration(source);
      verifyMigration(source);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Use export, convert, review, apply, verify, or migrate (optionally --local/--remote).');
      process.exitCode = 1;
  }
}


/******************************************************************************/


main().catch(error => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});


/******************************************************************************/