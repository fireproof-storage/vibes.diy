#!/bin/bash

# Extract OpenRouter API key from .env file using xargs
if [ -f .env ]; then
  if grep -q "OPENROUTER_API_KEY" .env; then
    API_KEY=$(grep "OPENROUTER_API_KEY" .env | xargs | cut -d "=" -f2)
  elif grep -q "CALLAI_API_KEY" .env; then
    API_KEY=$(grep "CALLAI_API_KEY" .env | xargs | cut -d "=" -f2)
  fi
fi

# Fallback to environment variable if not found in .env
if [ -z "$API_KEY" ]; then
  API_KEY="${OPENROUTER_API_KEY:-$CALLAI_API_KEY}"
fi

if [ -z "$API_KEY" ]; then
  echo "Error: No OpenRouter API key found. Please set OPENROUTER_API_KEY or CALLAI_API_KEY in your .env file or environment."
  exit 1
fi

# Define the request payload for OpenRouter format with the todo list schema
read -r -d '' PAYLOAD << EOM
{
  "model": "anthropic/claude-3-7-sonnet-20250219",
  "max_tokens": 1024,
  "stream": true,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "todo",
        "description": "Create a todo list with 5-7 items",
        "parameters": {
          "type": "object",
          "properties": {
            "todos": {
              "type": "array",
              "items": { "type": "string" },
              "minItems": 5,
              "maxItems": 7,
              "description": "A list of 5-7 todo items"
            }
          },
          "required": ["todos"]
        }
      }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "Create a todo list for planning an intergalactic space vacation to the Andromeda galaxy. Include 5-7 specific items for this unique journey."
    }
  ]
}
EOM

echo "API Key: ${API_KEY:0:3}...${API_KEY: -3}"
echo "Sending request to OpenRouter for Claude..."

# Make the curl request with detailed output
curl -v --no-buffer "https://openrouter.ai/api/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -H "HTTP-Referer: http://localhost:3000" \
  -H "X-Title: Testing Tool Mode" \
  -d "$PAYLOAD"

echo # Add a newline after the response

# Also print the exact curl command for manual testing (without -v for cleaner output)
echo -e "\n\nExact curl command for manual testing:"
echo "curl \"https://openrouter.ai/api/v1/chat/completions\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$OPENROUTER_API_KEY\" \\"
echo "  -H \"HTTP-Referer: http://localhost:3000\" \\"
echo "  -H \"X-Title: Testing Tool Mode\" \\"
echo "  -d '$PAYLOAD'" 