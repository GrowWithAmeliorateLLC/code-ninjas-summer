// The generate function's single source of truth is ./generate.js.
// Netlify resolves one function named "generate" for the duplicate basename;
// re-exporting here guarantees identical behavior whichever file it picks.
// Safe to delete this file in GitHub once you're happy with generate.js.
export { default } from './generate.js'
