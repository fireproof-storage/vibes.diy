#!/bin/bash

# Extract Anthropic API key from .env file using xargs
if [ -f .env ]; then
  if grep -q "ANTHROPIC_API_KEY" .env; then
    API_KEY=$(grep "ANTHROPIC_API_KEY" .env | xargs | cut -d "=" -f2)
  fi
fi

# Fallback to environment variable if not found in .env
if [ -z "$API_KEY" ]; then
  API_KEY="${ANTHROPIC_API_KEY}"
fi

if [ -z "$API_KEY" ]; then
  echo "Error: No Anthropic API key found. Please set ANTHROPIC_API_KEY in your .env file or environment."
  exit 1
fi

# Define the request payload using Claude's native format with the todo list schema from the tests
read -r -d '' PAYLOAD << EOM
{
  "model": "claude-3-7-sonnet-20250219",
  "max_tokens": 1024,
  "tools": [
    {
      "name": "todo",
      "description": "Create a todo list with 5-7 items",
      "input_schema": {
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
echo "Sending request directly to Anthropic Claude API with todo schema..."

# Make the curl request with detailed output
curl -v "https://api.anthropic.com/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d "$PAYLOAD"

echo # Add a newline after the response

# Also print the exact curl command for manual testing (without -v for cleaner output)
echo -e "\n\nExact curl command for manual testing:"
echo "curl \"https://api.anthropic.com/v1/messages\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"x-api-key: \$ANTHROPIC_API_KEY\" \\"
echo "  -H \"anthropic-version: 2023-06-01\" \\"
echo "  -d '$PAYLOAD'" 