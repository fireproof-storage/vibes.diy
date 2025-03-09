import { describe, it, expect, vi } from 'vitest';
import { RegexParser } from '../RegexParser';

describe('3D Viewer Content Parsing', () => {
  it('should correctly parse raw 3D viewer content from the wire', () => {
    // The raw content from the wire
    const rawContent = `{"dependencies": {
  "react-three-fiber": "^8.15.19",
  "three": "^0.159.0"
}}

# 3D Viewer with Fireproof Integration

This is a simple 3D model viewer that lets you save and load 3D scene configurations. It uses React Three Fiber to create a 3D scene with cubes that can be customized and saved to Fireproof.

\`\`\`js
import React, { useState, useRef }
\`\`\`

That's it!`;

    // Create a spy to track emitted events
    const textSpy = vi.fn();
    const codeSpy = vi.fn();
    const dependenciesSpy = vi.fn();
    const codeBlockStartSpy = vi.fn();

    // Create parser and register event handlers
    const parser = new RegexParser();
    parser.on('text', textSpy);
    parser.on('code', codeSpy);
    parser.on('dependencies', dependenciesSpy);
    parser.on('codeBlockStart', codeBlockStartSpy);

    // Disable console.debug during test
    const originalConsoleDebug = console.debug;
    console.debug = vi.fn();

    // Process the raw content
    parser.write(rawContent);
    parser.end();

    // Restore console.debug
    console.debug = originalConsoleDebug;

    // Verify dependencies were parsed correctly
    expect(parser.dependencies).toEqual({
      'react-three-fiber': '^8.15.19',
      three: '^0.159.0',
    });

    // Verify the display text was parsed correctly
    expect(parser.displayText).toContain('3D Viewer with Fireproof Integration');
    expect(parser.displayText).toContain('This is a simple 3D model viewer');

    // Verify code block was detected
    // expect(parser.inCodeBlock).toBe(true);
    expect(parser.codeBlockContent).toContain('import React, { useState, useRef');

    // Verify events were emitted
    expect(dependenciesSpy).toHaveBeenCalled();
    expect(textSpy).toHaveBeenCalled();
    expect(codeBlockStartSpy).toHaveBeenCalled();
  });

  it('should match the expected chat output format', () => {
    // The raw content from the wire
    const rawContent = `{"dependencies": {
  "react-three-fiber": "^8.15.19",
  "three": "^0.159.0"
}}

# 3D Viewer with Fireproof Integration

This is a simple 3D model viewer that lets you save and load 3D scene configurations. It uses React Three Fiber to create a 3D scene with cubes that can be custom
writing code...
writing code...`;

    // Create parser
    const parser = new RegexParser();

    // Disable console.debug during test
    const originalConsoleDebug = console.debug;
    console.debug = vi.fn();

    // Process the raw content
    parser.write(rawContent);
    parser.end();

    // Restore console.debug
    console.debug = originalConsoleDebug;

    // Verify the display text matches the expected chat output
    expect(parser.displayText).toContain('3D Viewer with Fireproof Integration');
    expect(parser.displayText).toContain('This is a simple 3D model viewer');
    expect(parser.displayText).toContain('writing code...');

    // Verify we're not in a code block yet since we only have "writing code..." text
    expect(parser.inCodeBlock).toBe(false);
  });
});
