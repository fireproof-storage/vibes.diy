import { describe, it, expect } from 'vitest';
import { normalizeComponentExports } from '../app/utils/normalizeComponentExports';

describe('normalizeComponentExports BUG DEMONSTRATION', () => {
  it('CRITICAL BUG: the normalizer produces non-runnable code for variable components', () => {
    // Minimal test case to show the bug
    const input = `import React from "react"

const MyComponent = () => {
  return <div>Test</div>
}

export default MyComponent`;

    // What it actually produces
    const actualOutput = normalizeComponentExports(input);

    // What our fix now produces - which is the correct runnable output
    const expectedCorrectOutput = `import React from "react"
const MyComponent = () => {
  return <div>Test</div>
}
const App = MyComponent
export default App`;

    // This will fail showing the core issue
    console.log('\n----- THE BUG -----');
    console.log('ACTUAL OUTPUT:');
    console.log(actualOutput);
    console.log('\nEXPECTED OUTPUT (runnable code):');
    console.log(expectedCorrectOutput);
    console.log('\nPROBLEM: The normalizer replaces "export default MyComponent" with');
    console.log('"export default App;" WITHOUT creating "const App = MyComponent" first');
    console.log('This produces code that would throw a ReferenceError at runtime');
    console.log('because App is not defined');
    console.log('----- END BUG REPORT -----\n');

    // Direct comparison that fails
    expect(actualOutput).toEqual(expectedCorrectOutput);
  });
});
