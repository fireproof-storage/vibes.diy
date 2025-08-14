#!/bin/bash

# Extract API key from .env file using xargs
if [ -f .env ]; then
  if grep -q "CALLAI_API_KEY" .env; then
    API_KEY=$(grep "CALLAI_API_KEY" .env | xargs | cut -d "=" -f2)
  elif grep -q "OPENROUTER_API_KEY" .env; then
    API_KEY=$(grep "OPENROUTER_API_KEY" .env | xargs | cut -d "=" -f2)
  fi
fi

# Fallback to environment variables if not found in .env
if [ -z "$API_KEY" ]; then
  API_KEY="${CALLAI_API_KEY:-$OPENROUTER_API_KEY}"
fi

if [ -z "$API_KEY" ]; then
  echo "Error: No API key found. Please set CALLAI_API_KEY or OPENROUTER_API_KEY in your .env file or environment."
  exit 1
fi

# Define the request payload using Claude's native tool structure
read -r -d '' PAYLOAD << EOM
{
  "model": "anthropic/claude-3-sonnet",
  "max_tokens": 1024,
  "tools": [
    {
      "name": "get_weather",
      "description": "Get the current weather in a given location",
      "input_schema": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "The city and state, e.g. San Francisco, CA"
          }
        },
        "required": ["location"]
      }
    }
  ],
  "tool_choice": {
    "type": "tool",
    "name": "get_weather"
  },
  "messages": [
    {
      "role": "user",
      "content": "What is the weather like in San Francisco?"
    }
  ]
}
EOM

echo "API Key: ${API_KEY:0:3}...${API_KEY: -3}"
echo "Sending request to OpenRouter API with Claude's native tool structure..."

# Make the curl request with detailed output
curl -v "https://openrouter.ai/api/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -H "HTTP-Referer: https://github.com/jchrisa/call-ai" \
  -d "$PAYLOAD"

echo # Add a newline after the response

# Also print the exact curl command for manual testing (without -v for cleaner output)
echo -e "\n\nExact curl command for manual testing:"
echo "curl \"https://openrouter.ai/api/v1/chat/completions\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer $API_KEY\" \\"
echo "  -H \"HTTP-Referer: https://github.com/jchrisa/call-ai\" \\"
echo "  -d '$PAYLOAD'" 