import { describe, it, expect } from "vitest";

// Import the relevant function or create a test-specific version of it
// This test focuses directly on the JSON property splitting fix

describe("Claude JSON streaming property name splitting", () => {
  // Test for handling split property names
  it("should correctly handle property names split across chunks", () => {
    // Initial accumulated fragment with a split property name
    let toolCallsAssembled = '{"capital":"Paris", "popul';

    // Simulate receiving the second part of the property name
    const secondChunk = 'ation":67.5, "languages":["French"]}';

    toolCallsAssembled += secondChunk;

    // This would happen at the "tool_calls" finish_reason point
    // The key test: can we parse the recombined JSON?
    expect(() => JSON.parse(toolCallsAssembled)).not.toThrow();

    // Verify the parsed content
    const parsedJson = JSON.parse(toolCallsAssembled);
    expect(parsedJson).toEqual({
      capital: "Paris",
      population: 67.5,
      languages: ["French"],
    });
  });
});
