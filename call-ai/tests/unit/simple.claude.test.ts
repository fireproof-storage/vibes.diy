/* eslint-disable no-useless-escape */
import { callAi } from "call-ai";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock global fetch
const globalFetch = vi.fn<typeof fetch>();
global.fetch = globalFetch as typeof fetch;

describe("Claude JSON Property Splitting Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle property name splitting across chunks", async () => {
    // This test specifically targets Claude's JSON property splitting issue
    const options = {
      apiKey: "test-api-key",
      model: "anthropic/claude-3-sonnet",
      stream: true,
      debug: true, // Enable debug mode to see what's happening
      schema: {
        type: "object",
        properties: {
          capital: { type: "string" },
          population: { type: "number" },
          languages: { type: "array", items: { type: "string" } },
        },
      },
    };

    // Create a simple mock that focuses on the specific property splitting issue
    const mockResponse = {
      ok: true,
      status: 200,
      headers: {
        forEach: vi.fn(),
      },
      body: {
        getReader: vi.fn().mockReturnValue({
          read: vi
            .fn<() => Promise<{ done: boolean; value?: Uint8Array }>>()
            // Streaming setup chunk
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(`data: {"type":"message_start"}\n\n`),
            })
            // First part with split property "popul"
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                `data: {"type":"content_block_delta","delta":{"text":"{\\\"capital\\\":\\\"Paris\\\", \\\"popul"}}\n\n`,
              ),
            })
            // Second part with "ation" completing the property name
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                `data: {"type":"content_block_delta","delta":{"text":"ation\\\":67.5, \\\"languages\\\":[\\\"French\\\"]}"}}\n\n`,
              ),
            })
            // Final chunk with tool_calls completion signal
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(`data: {"type":"message_delta","delta":{"stop_reason":"tool_calls"}}\n\n`),
            })
            // End of stream
            .mockResolvedValueOnce({
              done: true,
            }),
        }),
      },
    } as unknown as Response;

    // Override global.fetch mock for this test
    globalFetch.mockResolvedValueOnce(mockResponse);

    const generator = (await callAi("Provide information about France.", options)) as AsyncGenerator<string, string, unknown>;

    // The expected final parsed result
    const expectedResult = {
      capital: "Paris",
      population: 67.5,
      languages: ["French"],
    };

    // Collect results from streaming
    let finalResult = "";
    let chunkCount = 0;

    for await (const chunk of generator) {
      console.log(`Chunk ${++chunkCount}:`, chunk);
      finalResult = chunk;
    }

    console.log("Final result:", finalResult);

    // The key test - our implementation should produce valid JSON
    // despite the property name "population" being split across chunks
    const parsedResult = JSON.parse(finalResult);

    // Validate the parsed result matches our expectations
    expect(parsedResult).toEqual(expectedResult);

    // We should receive a single chunk with the complete JSON
    expect(chunkCount).toBe(1);
  });
});
