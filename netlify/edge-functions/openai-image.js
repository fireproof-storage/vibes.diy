export default async (request, context) => {
  console.log(`💾 EDGE FUNCTION: Image request received for ${request.url}`);
  // Extract the path segment after /api/openai-image/
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  // Extract the action and strip any file extension like .html
  let action = pathSegments[3] || ''; // e.g., "generate", "edit"
  action = action.split('.')[0]; // Remove any file extension
  console.log(`📍 EDGE FUNCTION: Processing image action: ${action}`);

  try {
    // Authorization validation
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract userId from request body if available
    let requestBody;
    const contentType = request.headers.get('Content-Type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // For multipart form data (used in edit endpoint with image uploads)
      const formData = await request.formData();
      requestBody = Object.fromEntries(formData.entries());
      console.log(`📥 EDGE FUNCTION: Image request form data:`, Object.keys(requestBody));
    } else {
      // For JSON requests
      try {
        requestBody = await request.json();
        console.log(`📥 EDGE FUNCTION: Image request data:`, requestBody);
      } catch (e) {
        console.log(`⚠️ EDGE FUNCTION: No JSON body in request`);
        requestBody = {};
      }
    }

    const userId = requestBody.userId || 'anonymous';
    console.log(`👤 EDGE FUNCTION: User identified as: ${userId}`);

    // Access the OpenAI API key from environment variables
    const openaiApiKey = Netlify.env.get('OPENAI_API_KEY');
    console.log(`🔑 EDGE FUNCTION: OpenAI API key ${openaiApiKey ? 'found' : 'NOT FOUND'}`);

    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle different image API actions
    switch (action) {
      case 'generate':
        return await handleGenerateImage(requestBody, openaiApiKey, userId);
      case 'edit':
        return await handleEditImage(request, requestBody, openaiApiKey, userId);
      default:
        return new Response(JSON.stringify({ error: 'Invalid image action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error(`❌ EDGE FUNCTION: Error:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Function to generate images using OpenAI API
async function handleGenerateImage(requestData, openaiApiKey, userId) {
  console.log(`🖼️ Edge Function: Generating image for user: ${userId}`);
  try {
    const { 
      prompt,
      model = 'gpt-image-1', // default to GPT Image model
      n = 1, // number of images to generate
      quality = 'auto', // low, medium, high, or auto
      size = 'auto', // 1024x1024, 1536x1024, 1024x1536, or auto
      background = 'auto', // transparent or opaque or auto
      output_format = 'png', // png, jpeg, or webp
      output_compression = null, // 0-100 for jpeg and webp
      moderation = 'auto' // auto or low
    } = requestData;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`🎨 Edge Function: Image generation with prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);

    // Prepare request body with conditional parameters
    const requestBody = {
      prompt,
      model,
      n,
      quality,
      size,
      background,
      user: userId // For OpenAI billing purposes
    };
    
    // Only add output format and compression if specified
    if (output_format) requestBody.output_format = output_format;
    if (output_compression !== null && (output_format === 'jpeg' || output_format === 'webp')) {
      requestBody.output_compression = output_compression;
    }
    if (moderation) requestBody.moderation = moderation;
    
    // Send request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Edge Function: Error generating image:`, data);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate image', 
        details: data 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ EDGE FUNCTION: Successfully generated image`);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`❌ Edge Function: Error in handleGenerateImage:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Function to edit images using OpenAI API
async function handleEditImage(request, requestData, openaiApiKey, userId) {
  console.log(`🖌️ Edge Function: Editing image for user: ${userId}`);
  try {
    const { 
      prompt,
      model = 'gpt-image-1', // GPT Image model
      n = 1, // number of images to generate
      quality = 'auto', // low, medium, high, or auto
      size = 'auto', // auto, 1024x1024, etc.
      background = 'auto', // transparent, opaque, or auto
      output_format = 'png', // png, jpeg, or webp
      output_compression = null, // 0-100 for jpeg and webp
      moderation = 'auto' // auto or low
    } = requestData;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // For image edits, we need to get the image data from FormData
    let imageData;
    let maskData = null;
    let multipleImages = [];
    
    // Process form data to extract images
    const formData = await request.formData();
    for (const [name, value] of formData.entries()) {
      if (name === 'image' && value instanceof File) {
        imageData = await value.arrayBuffer();
      } else if (name === 'mask' && value instanceof File) {
        maskData = await value.arrayBuffer();
      } else if ((name === 'images[]' || name === 'image[]') && value instanceof File) {
        // Multiple reference images
        multipleImages.push(await value.arrayBuffer());
      }
    }

    if (!imageData && multipleImages.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one image must be provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`🎨 Edge Function: Image edit with prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`); 
    console.log(`📊 Edge Function: Edit with ${imageData ? 'single image' : ''} ${maskData ? 'and mask' : ''} ${multipleImages.length > 0 ? `and ${multipleImages.length} reference images` : ''}`);
    
    // Prepare request body
    const formDataToSend = new FormData();
    formDataToSend.append('prompt', prompt);
    formDataToSend.append('model', model);
    // response_format is not needed for gpt-image-1
    formDataToSend.append('quality', quality);
    formDataToSend.append('size', size);
    formDataToSend.append('background', background);
    if (output_format) formDataToSend.append('output_format', output_format);
    if (output_compression !== null && (output_format === 'jpeg' || output_format === 'webp')) {
      formDataToSend.append('output_compression', output_compression.toString());
    }
    if (moderation) formDataToSend.append('moderation', moderation);
    formDataToSend.append('user', userId);
    
    // Add images - handling both single image and multiple images cases
    if (multipleImages.length > 0) {
      // Multiple images case (like the gift basket example)
      multipleImages.forEach((imgBuffer, index) => {
        formDataToSend.append('image', new Blob([imgBuffer]), `image-${index}.png`);
      });
    } else if (imageData) {
      // Single image case
      formDataToSend.append('image', new Blob([imageData]), 'image.png');
      
      if (maskData) {
        formDataToSend.append('mask', new Blob([maskData]), 'mask.png');
      }
    }

    // Send request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/images/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formDataToSend,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Edge Function: Error editing image:`, data);
      return new Response(JSON.stringify({ 
        error: 'Failed to edit image', 
        details: data 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ EDGE FUNCTION: Successfully edited image`);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`❌ Edge Function: Error in handleEditImage:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
