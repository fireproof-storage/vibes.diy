// Basic test for Claude tool mode

import { callAi } from "call-ai";
import { dotenv } from "zx";

dotenv.config();

// Helper function with timeout
const callWithTimeout = async <T>(promiseFn: () => Promise<T>, timeout = 30000): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    // Create a timeout that will reject the promise
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeout}ms`));
    }, timeout);

    promiseFn()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

async function main(): Promise<void> {
  // Get API key from environment, trying both variables
  const apiKey = process.env.CALLAI_API_KEY || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("Error: No API key found. Please set CALLAI_API_KEY or OPENROUTER_API_KEY in your .env file.");
    process.exit(1);
  }

  // Define a simple todo list schema
  const todoSchema = {
    name: "todo_list",
    properties: {
      todos: {
        type: "array",
        items: { type: "string" },
      },
    },
  };

  console.log("Testing Claude with tool mode (automatic):");

  try {
    // Test Claude with tool mode (automatic)
    const claudeResult = await callWithTimeout(async () => {
      return callAi("Create a todo list for a productive day", {
        apiKey: apiKey,
        model: "anthropic/claude-3-sonnet",
        schema: todoSchema,
      });
    });

    console.log("Claude tool mode result:", claudeResult);

    if (typeof claudeResult === "string") {
      try {
        const parsedJson = JSON.parse(claudeResult);
        console.log("Parsed JSON:", parsedJson);
      } catch (e) {
        console.log("Failed to parse JSON:", (e as Error).message);
      }
    } else {
      console.log("Result is not a string:", typeof claudeResult);
    }

    // Compare with OpenAI
    console.log("-".repeat(80));
    console.log("Testing OpenAI with json_schema:");

    const openaiResult = await callWithTimeout(async () => {
      return callAi("Create a todo list for a productive day", {
        apiKey: apiKey,
        model: "openai/gpt-4o-mini",
        schema: todoSchema,
      });
    });

    console.log("OpenAI json_schema result:", openaiResult);

    if (typeof openaiResult === "string") {
      try {
        const parsedJson = JSON.parse(openaiResult);
        console.log("Parsed JSON:", parsedJson);
      } catch (e) {
        console.log("Failed to parse JSON:", (e as Error).message);
      }
    } else {
      console.log("Result is not a string:", typeof openaiResult);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
