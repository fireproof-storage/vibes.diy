/**
 * Cleans the code string by removing any content before the first import or export statement
 */
export function cleanCodeBeforeImport(codeString: string): string {
  return codeString.replace(/^[\s\S]*?(import|export)/, '$1');
}

/**
 * Processes the code for display in the Sandpack editor
 */
export function processCodeForDisplay(sourceCode: string): string {
  return cleanCodeBeforeImport(sourceCode) + '\n\n\n\n\n\n\n\n\n\n';
}
