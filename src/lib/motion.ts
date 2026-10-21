// Motion helpers with no React, so `node --test` can cover them.

/** Users who ask for less motion, and Node (tests, server render), skip motion. */
export function reducedMotion(): boolean {
  return typeof matchMedia === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches;
}
