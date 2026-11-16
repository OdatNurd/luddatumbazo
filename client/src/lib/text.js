/******************************************************************************/


/* Fold text for accent-insensitive comparison.
 *
 * Game names can carry diacritics (Märklin, for example), while a query is
 * usually typed with the plain ASCII letters. NFD separates a letter from its
 * combining marks, so removing those marks leaves the base letter and both
 * sides of a comparison agree.
 *
 * This deliberately leaves ligatures and letters that do not decompose under
 * NFD alone (such as ß, æ and ø) unchanged. */
export function foldText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}


/******************************************************************************/
