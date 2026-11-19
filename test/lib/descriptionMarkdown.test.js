import test from 'node:test';
import assert from 'node:assert/strict';

import {
  gameDescriptionToMarkdown,
  decodeDescriptionEntities,
  descriptionEntityTokens,
  isDescriptionConversionCandidate
} from '../../service/src/lib/descriptionMarkdown.js';


/******************************************************************************/


const HARD_BREAK = `${String.fromCharCode(92)}\n`;


/******************************************************************************/


test('one br is a Markdown hard break', () => {
  assert.equal(gameDescriptionToMarkdown('A<br>B'), `A${HARD_BREAK}B`);
  assert.equal(gameDescriptionToMarkdown('A<br/>B'), `A${HARD_BREAK}B`);
  assert.equal(gameDescriptionToMarkdown('A<br />B'), `A${HARD_BREAK}B`);
});


test('two or more brs are one paragraph break', () => {
  assert.equal(gameDescriptionToMarkdown('A<br><br>B'), 'A\n\nB');
  assert.equal(gameDescriptionToMarkdown('A<br/><br/><br/>B'), 'A\n\nB');
  assert.equal(gameDescriptionToMarkdown('A<br> \n <br/>B'), 'A\n\nB');
});


test('leading and trailing brs do not create empty paragraphs', () => {
  assert.equal(gameDescriptionToMarkdown('<br><br>A<br><br>'), 'A');
  assert.equal(gameDescriptionToMarkdown('A<br/><br/>'), 'A');
});


test('entities decode in HTML and plain text', () => {
  const expected = 'Déjà vu © 😀 é é é &';
  assert.equal(gameDescriptionToMarkdown('<p>D&eacute;j&agrave; vu &copy; &#x1F600; &amp;eacute; &amp;#233; &amp;#xE9;</p>'), 'Déjà vu © 😀 é é é');
  assert.equal(gameDescriptionToMarkdown('D&eacute;j&agrave; vu &copy; &#x1F600; &amp;eacute; &amp;#233; &amp;#xE9; &amp;'), expected);
  assert.equal(decodeDescriptionEntities('&eacute; &#233; &#xE9; &amp;eacute; &amp;#233; &amp;#xE9;'), 'é é é é é é');
});


test('named entities are handled by the full HTML5 entity set', () => {
  const cases = [
    ['&amp;', '&'], ['&lt;', '<'], ['&gt;', '>'], ['&quot;', '"'], ['&apos;', "'"],
    ['&nbsp;', '\u00a0'], ['&ndash;', '–'], ['&mdash;', '—'], ['&hellip;', '…'],
    ['&frac12;', '½'], ['&copy;', '©'], ['&reg;', '®'], ['&trade;', '™'],
    ['&times;', '×'], ['&divide;', '÷'], ['&plusmn;', '±'], ['&deg;', '°'],
    ['&micro;', 'µ'], ['&para;', '¶'], ['&sect;', '§'], ['&laquo;', '«'],
    ['&raquo;', '»'], ['&ldquo;', '“'], ['&rdquo;', '”'], ['&lsquo;', '‘'],
    ['&rsquo;', '’'], ['&bull;', '•'], ['&dagger;', '†'], ['&Dagger;', '‡'],
    ['&euro;', '€'], ['&pound;', '£'], ['&yen;', '¥'], ['&cent;', '¢'],
    ['&alpha;', 'α'], ['&Omega;', 'Ω'], ['&sum;', '∑'], ['&infin;', '∞'],
    ['&ne;', '≠'], ['&le;', '≤'], ['&ge;', '≥'], ['&rarr;', '→'],
    ['&larr;', '←'], ['&harr;', '↔'], ['&spades;', '♠'], ['&hearts;', '♥'],
    ['&clubs;', '♣'], ['&diams;', '♦'], ['&ensp;', '\u2002'], ['&emsp;', '\u2003'],
    ['&thinsp;', '\u2009'], ['&zwnj;', '\u200c'], ['&zwj;', '\u200d']
  ];

  for (const [input, output] of cases) {
    assert.equal(decodeDescriptionEntities(input), output, input);
  }
});


test('numeric entities decode in decimal and hex, including Unicode', () => {
  assert.equal(decodeDescriptionEntities('&#233; &#xE9; &#XE9; &#x1F600; &#128512;'), 'é é é 😀 😀');
});


test('unknown entities are preserved and escaped for Markdown', () => {
  assert.equal(gameDescriptionToMarkdown('A &unknown; B'), 'A \\&unknown; B');
  assert.equal(decodeDescriptionEntities('&unknown;'), '&unknown;');
});


test('decoded Markdown punctuation is escaped as literal text', () => {
  assert.equal(gameDescriptionToMarkdown('<p>&ast; &lowbar; &lsqb;x&rsqb; &verbar;</p>'), '\\* \\_ \\[x\\] \\|');
});


test('HTML formatting is converted to Markdown', () => {
  assert.equal(
    gameDescriptionToMarkdown('<p><strong>Bold</strong> <em>em</em> <del>gone</del> <code>a`b</code></p>'),
    '**Bold** *em* ~~gone~~ ``a`b``'
  );
  assert.equal(gameDescriptionToMarkdown('<h4>Four</h4><h1>One</h1>'), '### Four\n\n# One');
});


test('links are preserved, normalized, and unsafe schemes are dropped', () => {
  const output = gameDescriptionToMarkdown(
    '<p><a href="/boardgame/13">BGG</a> <a href="https://example.com/a(b)">Paren</a> ' +
    '<a href="mailto:a@b.c">Mail</a> <a href="javascript:alert(1)">Bad</a></p>'
  );

  assert.equal(
    output,
    '[BGG](https://boardgamegeek.com/boardgame/13) [Paren](<https://example.com/a(b)>) [Mail](mailto:a@b.c) Bad'
  );
});


test('lists, blockquotes and tables become Markdown structures', () => {
  assert.equal(
    gameDescriptionToMarkdown('<ul><li>one</li><li>two<ul><li>nested</li></ul></li></ul>'),
    '- one\n- two\n  - nested'
  );
  assert.equal(
    gameDescriptionToMarkdown('<ol start="3"><li>three</li><li>four</li></ol>'),
    '3. three\n4. four'
  );
  assert.equal(
    gameDescriptionToMarkdown('<blockquote><p>one<br>two</p><p>three</p></blockquote>'),
    `> one${HARD_BREAK}> two\n>\n> three`
  );
  assert.equal(
    gameDescriptionToMarkdown('<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>'),
    '| A | B |\n| --- | --- |\n| 1 | 2 |'
  );
});


test('preformatted blocks use a safe fence and keep the language class', () => {
  const output = gameDescriptionToMarkdown('<pre><code class="language-js">const x = `a`;\n&lt;tag&gt;</code></pre>');
  assert.equal(output, '```js\nconst x = `a`;\n<tag>\n```');
});


test('scripts, styles and images do not leak into Markdown', () => {
  assert.equal(gameDescriptionToMarkdown('<p>foo<script>alert(1)</script>bar<style>x</style>baz</p>'), 'foobarbaz');
  assert.equal(gameDescriptionToMarkdown('<p>before<img src="x" alt="cover">after</p>'), 'beforeafter');
});


test('unknown tags are unwrapped and raw prose is escaped', () => {
  assert.equal(gameDescriptionToMarkdown('<p>A <unknown>thing</unknown> B</p>'), 'A thing B');
  assert.equal(gameDescriptionToMarkdown('<p>A <world> B</p>'), 'A \\<world> B');
  assert.equal(gameDescriptionToMarkdown('<p>2 &lt; 3 and a &lt; b &gt; c</p>'), '2 < 3 and a < b > c');
  assert.equal(gameDescriptionToMarkdown('<p># heading<br>- list<br>1. item<br>&gt; quote</p>'), `\\# heading${HARD_BREAK}\\- list${HARD_BREAK}1\\. item${HARD_BREAK}\\> quote`);
});


test('plain text preserves paragraphs and single line breaks', () => {
  assert.equal(gameDescriptionToMarkdown('one\ntwo\n\nthree'), 'one\ntwo\n\nthree');
  assert.equal(gameDescriptionToMarkdown('A &nbsp; B\n\nC\td'), 'A B\n\nC d');
});


test('migration candidates are conservative', () => {
  assert.equal(isDescriptionConversionCandidate('plain description'), false);
  assert.equal(isDescriptionConversionCandidate('**already Markdown**'), false);
  assert.equal(isDescriptionConversionCandidate('A &eacute;'), true);
  assert.equal(isDescriptionConversionCandidate('A<br>B'), true);
  assert.equal(isDescriptionConversionCandidate('A <custom>tag</custom> B'), true);
  assert.equal(isDescriptionConversionCandidate('Intro\n\n    indented plain text'), true);
  assert.equal(isDescriptionConversionCandidate(''), false);
});


test('entity tokens include named and numeric references', () => {
  assert.deepEqual(
    descriptionEntityTokens('&eacute; &#233; &#xE9; &amp;eacute; &unknown;'),
    ['&eacute;', '&#233;', '&#xE9;', '&amp;', '&unknown;']
  );
});


/******************************************************************************/