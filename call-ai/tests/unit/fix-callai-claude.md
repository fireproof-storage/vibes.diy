# Claude API Timeout Issue & Fix

## Issue Description

We've identified a critical issue with the Claude API when using tool mode:

1. The HTTP request to the API succeeds (HTTP 200 response)
2. However, when trying to read the response body using `response.text()`, the operation hangs indefinitely
3. This is causing the tests to time out when using Claude with tool mode

Key observations:

- System message approach works fine with Claude (completes in 2-6 seconds)
- Tool mode approach times out when trying to read the response body
- The issue appears to be in the response format (many empty newlines at the beginning of the response)
- The JWT warning in the headers does not prevent the system message approach from working

## Root Cause

The root cause appears to be an issue with the Claude API's response format when using tool mode via OpenRouter. The response body starts with many empty newlines, which causes the `response.text()` method to hang when trying to read the complete response.

## Fix Solution

The solution is to add a timeout specifically for the `response.text()` operation when dealing with Claude API responses. Here's a proposed fix:

```typescript
/**
 * Helper function to read response text with timeout
 */
const readResponseTextWithTimeout = async (response: Response, timeoutMs: number = 30000): Promise<string> => {
  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Response.text() timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    // Race the response.text() promise against the timeout
    const text = await Promise.race([response.text(), timeoutPromise]);
    return text;
  } catch (error) {
    // If timeout occurs, throw a more descriptive error
    if (error instanceof Error && error.message.includes("timed out")) {
      throw new Error(`Timeout reading response from API. This is a known issue with Claude API when using tool mode.`);
    }
    throw error;
  }
};

/**
 * Modify the fetch call for Claude API to use the timeout function
 */
// In the callAi function where the fetch response is processed:
let responseText;
try {
  // Use the timeout function for Claude API with tool mode
  if (model.includes("claude") && tools) {
    responseText = await readResponseTextWithTimeout(response);
  } else {
    // For other models, use the standard response.text()
    responseText = await response.text();
  }
} catch (error) {
  // Handle the error, possibly fallback to system message approach
  console.error("Error reading response:", error.message);
  throw error;
}
```

## Alternative Solutions

1. **Workaround**: Use system message approach instead of tool mode for Claude models

   ```typescript
   // Detect Claude model and force system message approach even if tool mode was requested
   if (model.includes("claude") && tools) {
     console.warn("Tool mode with Claude may cause timeouts, using system message approach instead");
     // Transform request to use system message approach
     // ...
   }
   ```

2. **Hybrid approach**: Try tool mode first, then fallback to system message approach if it fails
   ```typescript
   // Try tool mode first for Claude
   try {
     // Attempt tool mode with timeout protection
     const result = await callWithToolMode();
     return result;
   } catch (error) {
     // If timeout error, fallback to system message approach
     if (error.message.includes("timeout")) {
       console.warn("Tool mode timed out, falling back to system message approach");
       const fallbackResult = await callWithSystemMessage();
       return fallbackResult;
     }
     throw error;
   }
   ```

## Recommendation

We recommend implementing the timeout protection for `response.text()` as the primary fix, as it directly addresses the root cause without changing the API behavior. The timeout will prevent indefinite hanging and provide a clear error message.

Additionally, adding a warning in the documentation about potential timeouts when using Claude with tool mode would be helpful for users.
