/** Query helpers: `$` returns the first match, `$$` returns an array of all matches. */
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
