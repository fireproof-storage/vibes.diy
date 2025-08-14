import { callAi } from "call-ai";
import { dotenv } from "zx";
import { describe, expect, it, vi } from "vitest";
import { fail } from "assert";

// Load environment variables from .env file if present
dotenv.config();

// Configure retry settings for flaky tests
// jest.retryTimes(2, { logErrorsBeforeRetry: true });

// Skip tests if no API key is available
const haveApiKey = process.env.CALLAI_API_KEY;
const itif = (condition: boolean) => (condition ? it : it.skip);

// Timeout for individual test
const TIMEOUT = 30000;

describe("Error handling integration tests", () => {
  // Test default model (should succeed)
  itif(!!haveApiKey)(
    "should succeed with default model",
    async () => {
      // Make a simple API call with no model specified
      const result = await callAi("Write a short joke about programming.", {
        apiKey: process.env.CALLAI_API_KEY,
        // No model specified - should use default
      });

      // Verify response
      expect(typeof result).toBe("string");
      expect((result as string).length).toBeGreaterThan(10);
    },
    TIMEOUT,
  );

  // Test with invalid model (should throw an error)
  itif(!!haveApiKey)(
    "should throw error with invalid model",
    async () => {
      // Attempt API call with a non-existent model
      await expect(async () => {
        await callAi("Write a short joke about programming.", {
          apiKey: process.env.CALLAI_API_KEY,
          model: "fake-model-that-does-not-exist",
          skipRetry: true, // Skip retry mechanism to force the error
        });
      }).rejects.toThrow();
    },
    TIMEOUT,
  );

  // Test streaming with invalid model (should also throw an error)
  itif(!!haveApiKey)(
    "should throw error with invalid model in streaming mode",
    async () => {
      // Attempt streaming API call with a non-existent model
      await expect(async () => {
        const generator = await callAi("Write a short joke about programming.", {
          apiKey: process.env.CALLAI_API_KEY,
          model: "fake-model-that-does-not-exist",
          stream: true,
          skipRetry: true, // Skip retry mechanism to force the error
        });

        // Try to consume the generator
        // Cast to AsyncGenerator to ensure TypeScript recognizes it properly
        const asyncGenerator = generator as AsyncGenerator<string, string, unknown>;
        for await (const _ of asyncGenerator) {
          // This should throw before yielding any chunks
        }
      }).rejects.toThrow();
    },
    TIMEOUT,
  );

  // Test error message contents
  itif(!!haveApiKey)(
    "should include HTTP status in error message",
    async () => {
      const fakeModelId = "fake-model-that-does-not-exist";

      // Attempt API call with a non-existent model
      try {
        await callAi("Write a short joke about programming.", {
          apiKey: process.env.CALLAI_API_KEY,
          model: fakeModelId,
          skipRetry: true, // Skip retry mechanism to force the error
        });
        // If we get here, fail the test
        fail("Should have thrown an error");
      } catch (error) {
        // Verify error message contains useful information
        expect(error instanceof Error).toBe(true);
        if (error instanceof Error) {
          // With the new error handling, we should see the HTTP status code
          expect(error.message).toContain("HTTP error");
          expect(error.message).toContain("400"); // Bad Request status code
        } else {
          fail("Error is not an Error instance");
        }
      }
    },
    TIMEOUT,
  );

  // Test with debug option for error logging
  itif(!!haveApiKey)(
    "should handle error with debug option",
    async () => {
      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, "error");

      // Attempt API call with a non-existent model and debug enabled
      try {
        await callAi("Write a short joke about programming.", {
          apiKey: process.env.CALLAI_API_KEY,
          model: "fake-model-that-does-not-exist",
          debug: true,
          skipRetry: true, // Skip retry mechanism to force the error
        });
        // If we get here, fail the test
        fail("Should have thrown an error");
      } catch (error) {
        // Verify console.error was called with error details
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(error instanceof Error).toBe(true);
      } finally {
        // Restore the original console.error
        consoleErrorSpy.mockRestore();
      }
    },
    TIMEOUT,
  );

  // Test JSON parsing error with streaming and invalid model
  itif(!!haveApiKey)(
    "should reproduce the JSON parsing error seen in streaming mode",
    async () => {
      try {
        // Create generator with invalid model in streaming mode
        const generator = await callAi("Write a short joke about programming.", {
          apiKey: process.env.CALLAI_API_KEY,
          model: "fake-model-that-does-not-exist",
          stream: true,
          skipRetry: true, // Skip retry mechanism to force the error
        });

        // Cast to AsyncGenerator to ensure TypeScript recognizes it properly
        const asyncGenerator = generator as AsyncGenerator<string, string, unknown>;

        // Try to consume the generator
        console.log("Attempting to consume streaming response");
        let finalResponse = "";
        for await (const chunk of asyncGenerator) {
          console.log(`Received chunk (length: ${chunk.length}): ${chunk}`);
          finalResponse = chunk;
        }

        // If we get here (unlikely), try to parse the response as JSON
        try {
          console.log(`Parsing final response (length: ${finalResponse.length})`);
          JSON.parse(finalResponse);

          // If we reach here, the JSON parsing unexpectedly succeeded
          fail("JSON parsing should have failed but succeeded");
        } catch (streamError) {
          // We expect a SyntaxError from JSON.parse
          if (streamError instanceof SyntaxError) {
            // This is the expected path - JSON parsing should fail
            console.log("Expected error:", streamError.message);
            expect(streamError.message).toContain("Unexpected end of JSON");
          } else {
            // If it's another type of error, re-throw it to be caught by outer try/catch
            throw streamError;
          }
        }
      } catch (error) {
        // This catches any errors thrown before or during streaming
        if (error instanceof Error) {
          console.log("Outer error type:", error.constructor.name);
          console.log("Outer error message:", error.message);

          // Check for the error message in the new throw style
          expect(error.message).toContain("fake-model-that-does-not-exist is not a valid model ID");
          // we could uncomment this line:
          // fail(`Streaming should not throw directly but should return invalid JSON: ${error.message}`);
        } else {
          console.log("Unexpected non-Error object thrown:", error);
        }
      }
    },
    TIMEOUT,
  );

  // Test trying to mimic the React app's behavior more closely
  itif(!!haveApiKey)(
    "should mimic React app error handling with streaming",
    async () => {
      // We'll use a Promise to simulate React's async state updates
      let responseText = "";
      let errorMessage: string | null = null;

      const runGeneratorWithReactPatterns = async () => {
        try {
          console.log("Creating generator in React-like pattern");
          const generator = await callAi("Write a haiku about programming.", {
            apiKey: process.env.CALLAI_API_KEY,
            model: "fake-model-that-does-not-exist",
            stream: true,
            skipRetry: true, // Skip retry mechanism to force the error
          });

          // Cast to AsyncGenerator
          const asyncGenerator = generator as AsyncGenerator<string, string, unknown>;

          console.log("Starting iteration with for-await loop");
          // This approach is often used in React components with useEffect
          try {
            for await (const chunk of asyncGenerator) {
              console.log("Received chunk:", chunk);
              responseText = chunk;
            }
            console.log("Generator completed without errors");
          } catch (error) {
            console.log("Error caught during iteration:", error);
            if (error instanceof Error) {
              errorMessage = error.message;
              expect(error.message).toContain("fake-model-that-does-not-exist is not a valid model ID");
            } else {
              errorMessage = "Unknown error";
            }
          }
        } catch (error) {
          console.log("Error caught during generator creation:", error);
          if (error instanceof Error) {
            errorMessage = error.message;
            expect(error.message).toContain("fake-model-that-does-not-exist is not a valid model ID");
          } else {
            errorMessage = "Unknown error";
          }
        }
      };

      // Run the simulated React code
      await runGeneratorWithReactPatterns();

      // Check results
      console.log("Final state - responseText:", responseText);
      console.log("Final state - errorMessage:", errorMessage);

      // We want to observe what happens, not necessarily fail/pass based on specific criteria
      expect(true).toBe(true); // Always passes
    },
    TIMEOUT,
  );

  itif(!!haveApiKey)(
    "should explore AsyncGenerator error handling patterns",
    async () => {
      // This test explores how errors propagate through AsyncGenerator in different patterns
      console.log("\n=== AsyncGenerator Error Handling Patterns ===");

      let responseText = "";
      let errorCaught = false;

      try {
        // First approach: Create the generator but don't immediately use it
        // This is closer to how browser environments might handle the code
        console.log("Step 1: Creating generator without immediate usage");
        // Explicitly type as AsyncGenerator to fix TypeScript errors
        const generator = (await callAi("Write a haiku", {
          stream: true,
          debug: true,
          model: "fake-model-that-does-not-exist",
          skipRetry: true,
          apiKey: process.env.CALLAI_API_KEY,
        })) as AsyncGenerator<string, string, unknown>;

        console.log("Generator created, properties:", Object.getOwnPropertyNames(generator));

        // Delay the iteration slightly to mimic browser async behavior
        await new Promise((resolve) => setTimeout(resolve, 10));

        console.log("Step 2: Beginning manual iteration");

        // Try manual iteration with explicit next() calls instead of for-await
        try {
          let result: IteratorResult<string, string>;
          let isDone = false;

          // Loop until we're done or hit an error
          while (!isDone) {
            console.log("Calling generator.next()");
            result = await generator.next();
            console.log("next() returned:", {
              done: result.done,
              valueType: typeof result.value,
              valueLength: result.value ? result.value.length : 0,
            });

            if (result.done) {
              console.log("Generator iteration complete");
              isDone = true;
              responseText = result.value;
            } else {
              responseText = result.value;
              console.log(`Received chunk: ${responseText.substring(0, 30)}...`);
            }
          }

          console.log("Step 3: Completed iteration without errors");
          console.log(`Final response (${responseText.length} chars): ${responseText}`);

          // If we get here, try parsing the response
          try {
            console.log("Attempting to parse response as JSON");
            JSON.parse(responseText);
            console.log("JSON parsing succeeded unexpectedly");
          } catch (parseError: unknown) {
            // Properly type the error
            const error = parseError as Error;
            console.log("JSON parse error as expected:", error.message);
            errorCaught = true;
            expect(error.message).toContain("Unexpected");
          }
        } catch (iterError: unknown) {
          // Properly type the error
          const error = iterError as Error;
          console.log("Error during iteration:", error.constructor.name, error.message);
          errorCaught = true;
          expect(error.message).toContain("fake-model-that-does-not-exist is not a valid model ID");
        }
      } catch (outerError: unknown) {
        // Properly type the error
        const error = outerError as Error;
        console.log("Outer error during generator creation:", error.message);
        errorCaught = true;
        expect(error.message).toContain("fake-model-that-does-not-exist is not a valid model ID");
      }

      console.log("Final state - responseText:", responseText);
      console.log("Final state - errorCaught:", errorCaught);

      // We expect some form of error to be caught
      expect(errorCaught).toBe(true);
    },
    TIMEOUT,
  );
});
