/**
 * Type definitions for tree-sitter language packages
 */

declare module 'tree-sitter-javascript' {
  import { Language } from 'tree-sitter';
  const JavaScript: Language;
  export = JavaScript;
}

declare module 'tree-sitter-typescript' {
  import { Language } from 'tree-sitter';
  export const typescript: Language;
  export const tsx: Language;
}

declare module 'tree-sitter-python' {
  import { Language } from 'tree-sitter';
  const Python: Language;
  export = Python;
}
