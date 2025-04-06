/**
 * Attempts to normalize various React component export patterns to a standard
 * `export default App` format. This is necessary because the AI might generate
 * components with different export styles.
 *
 * Handles:
 * - export default function ComponentName() {}
 * - export default class ComponentName {}
 * - export default (props) => {};
 * - export default memo(Component);
 * - export default forwardRef(...);
 * - function ComponentName() {} export default ComponentName;
 * - class ComponentName {} export default ComponentName;
 * - const ComponentName = () => {}; export default ComponentName;
 * - export default { Component: ... } (attempts to find main component)
 * - export function ComponentName() {} (converts to default)
 * - export const ComponentName = ... (converts to default)
 */
export function normalizeComponentExports(code: string): string {
  let normalizedCode = code.trim();

  // Remove leading/trailing comments, especially /* @jsxImportSource ... */
  normalizedCode = normalizedCode.replace(/^\/\*[\s\S]*?\*\/\s*/, '');
  normalizedCode = normalizedCode.replace(/\s*\/\*[\s\S]*?\*\/$/, '');
  normalizedCode = normalizedCode.trim();

  let defaultExportFound = false;

  // --- Priority 1: Direct Default Exports ---

  // P6: HOCs (memo, forwardRef)
  const hocRegex = /export\s+default\s+(React\.)?(memo|forwardRef)\s*\(/;
  if (hocRegex.test(normalizedCode)) {
    defaultExportFound = true;
    // Replace 'export default memo(Component)' with 'const App = memo(Component); export default App;'
    // Replace 'export default forwardRef((props, ref) => ...)' with 'const App = forwardRef(...); export default App;'
    normalizedCode = normalizedCode.replace(
      /export\s+default\s+((React\.)?(memo|forwardRef)\s*\([^)]*\)(\([^)]*\))?)/, // Handle optional second paren for inline func HOCs
      'const App = $1'
    );
    // Add export statement if not present and clean up trailing semicolons
    normalizedCode = normalizedCode.replace(/;*$/, ';'); // Ensure there's a semicolon
    if (!/export\s+default\s+App\s*;?\s*$/.test(normalizedCode)) {
      normalizedCode += ' export default App;';
    }
  }
  // P3: Direct export default function declaration
  else if (/export\s+default\s+function\s+\w+/.test(normalizedCode)) {
    defaultExportFound = true;
    // Replace 'export default function AnyName(...)' with 'export default function App(...)'
    normalizedCode = normalizedCode.replace(
      /export\s+default\s+function\s+\w+\s*(\([^)]*\))/g,
      'export default function App$1'
    );
  }
  // P4: Direct export default class declaration
  else if (/export\s+default\s+class\s+\w+/.test(normalizedCode)) {
    defaultExportFound = true;
    // Replace 'export default class AnyName ...' with 'export default class App ...'
    normalizedCode = normalizedCode.replace(
      /export\s+default\s+class\s+\w+/g,
      'export default class App'
    );
  }
  // P7: Direct export default arrow function (including async)
  // Use RegExp constructor to be safe
  else if (new RegExp('export\\s+default\\s+(async\\s+)?\\(').test(normalizedCode)) {
    defaultExportFound = true;
    // Convert 'export default (...) => { ... }' to 'const App = (...) => { ... }; export default App;'
    normalizedCode = normalizedCode.replace(/export\s+default\s+/, 'const App = ');
    // Add export statement if not present and clean up trailing semicolons
    normalizedCode = normalizedCode.replace(/;*$/, ';'); // Ensure there's a semicolon
    if (!/export\s+default\s+App\s*;?\s*$/.test(normalizedCode)) {
      normalizedCode += '\nexport default App;';
    }
  }
  // P8: Object literal export (Attempt to find a component within)
  else if (/export\s+default\s+\{/.test(normalizedCode)) {
    // For the object literal export, we'll create a variable for it and reference it
    defaultExportFound = true;
    const exportMatch = normalizedCode.match(/export\s+default\s+(\{[\s\S]*?\});?/);
    if (exportMatch && exportMatch[1]) {
      // Save the object literal and replace it with a variable
      const objectLiteral = exportMatch[1];
      normalizedCode = normalizedCode.replace(
        /export\s+default\s+\{[\s\S]*?\};?/,
        `const AppObject = ${objectLiteral};\nconst App = AppObject.default || AppObject;\nexport default App;`
      );
    } else {
      // Fallback if we can't extract the object literal
      normalizedCode = `// Ambiguous export default object literal detected:\n// ${normalizedCode.replace(/^/gm, '// ')}`;
    }
  }
  // --- Priority 2: Named Declarations + Default Export ---
  // Only run if no direct default export was found above

  // P1: Named function declaration followed by export default
  else if (
    /(?:\s|^)function\s+(\w+)\s*\(/.test(normalizedCode) &&
    /export\s+default\s+\w+\s*;?\s*$/.test(normalizedCode)
  ) {
    const match = normalizedCode.match(/export\s+default\s+(\w+)\s*;?\s*$/);
    if (match) {
      const componentName = match[1];
      const funcRegex = new RegExp(`function\\s+${componentName}\\s*\\(`);
      if (funcRegex.test(normalizedCode)) {
        defaultExportFound = true;
        // Replace 'function Name(...)' with 'function App(...)' and 'export default Name' with 'export default App'
        normalizedCode = normalizedCode.replace(funcRegex, 'function App(');
        normalizedCode = normalizedCode.replace(
          /export\s+default\s+\w+\s*;?\s*$/,
          'export default App;'
        );
      }
    }
  }
  // P2: Named class declaration followed by export default
  else if (
    /(?:\s|^)class\s+(\w+)/.test(normalizedCode) &&
    /export\s+default\s+\w+\s*;?\s*$/.test(normalizedCode)
  ) {
    const match = normalizedCode.match(/export\s+default\s+(\w+)\s*;?\s*$/);
    if (match) {
      const componentName = match[1];
      const classRegex = new RegExp(`class\\s+${componentName}\\b`);
      if (classRegex.test(normalizedCode)) {
        defaultExportFound = true;
        // Replace 'class Name' with 'class App' and 'export default Name' with 'export default App'
        normalizedCode = normalizedCode.replace(classRegex, 'class App');
        normalizedCode = normalizedCode.replace(
          /export\s+default\s+\w+\s*;?\s*$/,
          'export default App;'
        );
      }
    }
  }
  // P5: Variable declaration assigned to arrow function/HOC + export default
  else if (
    /(?:\s|^)const\s+(\w+)\s*=\s*(?:\(|React\.memo|React\.forwardRef)/.test(normalizedCode) &&
    /export\s+default\s+\w+\s*;?\s*$/.test(normalizedCode)
  ) {
    const match = normalizedCode.match(/export\s+default\s+(\w+)\s*;?\s*$/);
    if (match) {
      const componentName = match[1];
      const arrowFuncRegex = new RegExp(`const\\s+${componentName}\\s*=`); // Match 'const Name ='
      if (arrowFuncRegex.test(normalizedCode)) {
        defaultExportFound = true;
        // Keep the original variable name, just change the export to 'export default App;'
        normalizedCode = normalizedCode.replace(
          /export\s+default\s+\w+\s*;?\s*$/,
          'export default App;'
        );
      }
    }
  }

  // --- Priority 3: Named Exports (if no default export was found/normalized) ---
  if (!defaultExportFound) {
    // P9: Generic named export (function or const)
    // Example: export function MyComponent() {} OR export const MyComponent = () => {}
    const namedFunctionRegex = /export\s+(async\s+)?function\s+(\w+)/;
    const namedConstRegex = /export\s+const\s+(\w+)\s*=/;

    let match;
    let componentName: string | null = null;
    let isFunction = false;
    let isAsync = false;

    if ((match = normalizedCode.match(namedFunctionRegex))) {
      componentName = match[2];
      isAsync = !!match[1];
      isFunction = true;
    } else if ((match = normalizedCode.match(namedConstRegex))) {
      componentName = match[1];
      isFunction = false; // It's a const (likely arrow function or HOC)
    }

    if (componentName) {
      defaultExportFound = true; // We are converting this to a default export
      // Replace 'export function/const Name' with 'function/const App'
      if (isFunction) {
        normalizedCode = normalizedCode.replace(
          namedFunctionRegex,
          `${isAsync ? 'async ' : ''}function App`
        );
      } else {
        normalizedCode = normalizedCode.replace(namedConstRegex, 'const App =');
      }
      // Add 'export default App;' at the end
      normalizedCode = normalizedCode.replace(/;*\s*$/, ''); // Clean trailing semicolons/whitespace
      if (!/export\s+default\s+App\s*;?\s*$/.test(normalizedCode)) {
        normalizedCode += `\nexport default App;`;
      }
    } else {
      // If no default or identifiable named export, maybe wrap in a comment or try a broader match?
      // For now, do nothing, let it pass through potentially un-normalized.
      // console.warn("Could not identify a default or named export to normalize.");
    }
  }

  // Final check: Ensure only one 'export default App' exists if we modified things
  if (defaultExportFound) {
    const exportDefaultCount = (normalizedCode.match(/export\s+default\s+App/g) || []).length;
    const exportDefaultFuncCount = (
      normalizedCode.match(/export\s+default\s+function\s+App/g) || []
    ).length;
    const exportDefaultClassCount = (normalizedCode.match(/export\s+default\s+class\s+App/g) || [])
      .length;

    // If we have duplicates like 'const App = ...; export default App; export default App;' remove extras
    // Or if we have 'export default function App(...); export default App;'
    if (exportDefaultCount + exportDefaultFuncCount + exportDefaultClassCount > 1) {
      // Prefer keeping the direct function/class export if present
      if (exportDefaultFuncCount > 0) {
        normalizedCode = normalizedCode.replace(
          /(export\s+default\s+App;?)/g,
          (match, _, offset, fullStr) => {
            // Remove 'export default App;' if 'export default function App' exists earlier
            return fullStr.substring(0, offset).includes('export default function App')
              ? ''
              : match;
          }
        );
      } else if (exportDefaultClassCount > 0) {
        normalizedCode = normalizedCode.replace(
          /(export\s+default\s+App;?)/g,
          (match, _, offset, fullStr) => {
            // Remove 'export default App;' if 'export default class App' exists earlier
            return fullStr.substring(0, offset).includes('export default class App') ? '' : match;
          }
        );
      } else {
        // Keep only the last 'export default App;'
        let lastIndex = normalizedCode.lastIndexOf('export default App');
        normalizedCode =
          normalizedCode.substring(0, lastIndex).replace(/export\s+default\s+App;?/g, '') +
          normalizedCode.substring(lastIndex);
      }
    }
    // Clean up whitespace and multiple semicolons potentially added
    normalizedCode = normalizedCode.replace(/;{2,}/g, ';').replace(/\s+\n/g, '\n').trim();
  }

  return normalizedCode;
}
