/******************************************************************************/


/* Icon library registration for Web Awesome.
 *
 * Web Awesome's "system" library — the one its own components draw from — is
 * fully offline already: it resolves from an inline SVG map to data URIs, so
 * we leave it untouched.
 *
 * The "default" library, however, resolves bare <wa-icon> names from Font
 * Awesome's CDN at runtime, which this application never wants. We override it
 * to resolve from Font Awesome glyphs vendored locally under
 * client/static/icons/fa instead (from the same release the package targets).
 *
 * Authored markup and database-referenced icon names use bootstrap-icons, so
 * the "bootstrap" library maps those names to vendored files under
 * client/static/icons. */
import { registerIconLibrary } from '@awesome.me/webawesome-pro/dist/webawesome.js';


/******************************************************************************/


/* The Font Awesome names that have a vendored regular (non solid) variant; any
 * other name resolves to its solid glyph. */
const regularVariants = new Set([
  'calendar',
  'circle-xmark',
  'clock',
  'copy',
  'eye',
  'eye-slash',
  'star',
  'user'
]);


/******************************************************************************/


/* Local Font Awesome resolver; icon requests become a fetch of a vendored file
 * in the static assets that ship with the app. */
const fontAwesome = {
  resolver: (name, family, variant) => {
    const style = (variant === 'regular' && regularVariants.has(name))
      ? 'regular'
      : 'solid';

    return `/icons/fa/${style}/${name}.svg`;
  }
};


/******************************************************************************/


/* Local bootstrap-icons resolver; the app and the database refer to icons by
 * their bootstrap-icons name, so this is a direct mapping to vendored files. */
const bootstrap = {
  resolver: name => `/icons/${name}.svg`
};


/******************************************************************************/


/* Register the libraries. "system" stays as Web Awesome ships it (its inline
 * icon map is offline by design); "default" is reclaimed from the CDN so that
 * anything else that falls through can only ever hit local files. */
export function initIcons() {
  registerIconLibrary('default', fontAwesome);
  registerIconLibrary('bootstrap', bootstrap);
}


/******************************************************************************/
