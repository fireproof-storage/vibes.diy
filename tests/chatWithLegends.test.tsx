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

    // Direct comparison that fails
    expect(actualOutput).toEqual(expectedCorrectOutput);
  });

  it('correctly preserves semicolons in component exports', () => {
    // Test for proper semicolon handling
    const inputWithSemicolons = `import React from "react";

const MyComponentWithSemicolons = () => {
  return (
    <div>Test with semicolons</div>
  );
};

export default MyComponentWithSemicolons;`;

    const result = normalizeComponentExports(inputWithSemicolons);
    
    // Check that the output preserves the proper semicolon style
    const expectedOutput = `import React from "react";

const MyComponentWithSemicolons = () => {
  return (
    <div>Test with semicolons</div>
  );
};

const App = MyComponentWithSemicolons;
export default App;`;
    
    expect(result).toEqual(expectedOutput);
  });
});
