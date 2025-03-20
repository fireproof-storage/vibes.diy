// Helper function for making AI calls
async function* callAI(prompt, schema = null, model = 'anthropic/claude-3-haiku') {
  try {
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${window.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', options);
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