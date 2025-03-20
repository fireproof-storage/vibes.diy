// Helper function for making AI calls
async function* callAI(prompt, schema = null, model = 'openrouter/auto', options = {}) {
  try {
    // Handle both string prompts and message arrays for backward compatibility
    const messages = Array.isArray(prompt) 
      ? prompt 
      : [{ role: 'user', content: prompt }];
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${window.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        stream: options.stream !== false, // Default to streaming
        messages: messages,
        // Pass through any additional options like temperature
        ...options,
        // Handle schema if provided
        ...(schema && { response_format: { 
          type: 'json_schema', 
          json_schema: {
            name: schema.name || 'response',
            strict: true,
            schema: {
              type: 'object',
              properties: schema.properties || {},
              required: schema.required || Object.keys(schema.properties || {}),
              additionalProperties: schema.additionalProperties !== undefined 
                ? schema.additionalProperties 
                : false
            }
          }
        }})
      })
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', requestOptions);
    
    // For non-streaming responses, return the full result
    if (options.stream === false) {
      const result = await response.json();
      const content = result.choices[0]?.message?.content || '';
      return content;
    }
    
    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          if (line.includes('[DONE]')) continue;
          
          try {
            const json = JSON.parse(line.replace('data: ', ''));
            const content = json.choices[0]?.delta?.content || '';
            text += content;
            yield text;
          } catch (e) {
            console.error("Error parsing chunk:", e);
          }
        }
      }
    }

    return text;
  } catch (error) {
    console.error("AI call failed:", error);
    return "Sorry, I couldn't process that request.";
  }
} 