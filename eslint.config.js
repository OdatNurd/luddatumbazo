import svelte from 'eslint-plugin-svelte';


/******************************************************************************/


/* ESLint configuration for the client's Svelte components, and nothing else.
 *
 * Deliberate scope: only the *.svelte files under client/src are linted. The
 * service, tools and test JavaScript are left alone; this exists to surface the
 * same diagnostics the editor's Svelte tooling reports, not to impose style
 * opinions on the rest of the codebase.
 *
 * Rule selection:
 *
 *   - svelte's recommended preset: correctness only (reactivity, directives,
 *     slots, stores). No formatting or naming rules from this plugin or any
 *     other; code style is the developer's business.
 *   - svelte/valid-compile: reports what the Svelte compiler itself objects to,
 *     which is where the a11y warnings live (the compiler emits them; the
 *     plugin has no a11y rules of its own). This is what makes the editor's
 *     complaints visible on the command line.
 *
 * Flat config (ESLint's only config format as of v10). */


export default [
  // Nothing but the client's Svelte components is ever linted. Rather than
  // ignore-everything-then-negate (which cannot re-include files whose parent
  // directories are themselves ignored), everything that is not a component is
  // excluded by extension or location.
  {
    ignores: [
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      '**/*.ts',
      '**/*.json',
      '**/*.jsonc',
      '**/*.md',
      '**/*.html',
      '**/*.css',
      '**/*.sql',
      'output/**',
      'data/**'
    ]
  },

  // The Svelte recommended correctness rules, scoped to the components.
  ...svelte.configs['flat/recommended'],

  {
    files: ['client/src/**/*.svelte'],

    rules: {
      // Surface the compiler's own diagnostics (including the a11y warnings
      // the editor shows) as lint problems.
      'svelte/valid-compile': 'error'
    }
  }
];


/******************************************************************************/
