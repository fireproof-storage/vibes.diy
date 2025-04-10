export default async (request, context) => {
  console.log(`💾 EDGE FUNCTION: Request received for ${request.url}`);
  // Extract the path segment after /api/callai/
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  // Extract the action and strip any file extension like .html
  let action = pathSegments[3] || ''; // e.g., "create-key", "check-credits"
  action = action.split('.')[0]; // Remove any file extension
  console.log(`📍 EDGE FUNCTION: Processing action: ${action}`);

  try {
    // For now, simple validation
    // This will be replaced with proper auth in the future
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract the userId from the request
    let requestData;
    try {
      requestData = await request.json();
      console.log(`📥 EDGE FUNCTION: Request data:`, requestData);
    } catch (e) {
      console.log(`⚠️ EDGE FUNCTION: No JSON body in request`);
      requestData = {};
    }

    const userId = requestData.userId || 'anonymous';
    console.log(`👤 EDGE FUNCTION: User identified as: ${userId}`);

    // Access the secure provisioning key from environment variables
    const provisioningKey = Netlify.env.get('SERVER_OPENROUTER_PROV_KEY');
    console.log(`🔑 EDGE FUNCTION: Provisioning key ${provisioningKey ? 'found' : 'NOT FOUND'}`);

    if (!provisioningKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle different API actions
    switch (action) {
      case 'create-key':
        return await handleCreateKey(requestData, provisioningKey, userId);
      case 'check-credits':
        return await handleCheckCredits(requestData, provisioningKey);
      case 'list-keys':
        return await handleListKeys(requestData, provisioningKey);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Function to create a new OpenRouter session key
async function handleCreateKey(requestData, provisioningKey, userId) {
  console.log(`🔑 Edge Function: Creating key for user: ${userId}`);
  try {
    const { name = 'Session Key', label = `session-${Date.now()}` } = requestData;

    const dollarAmount = userId !== 'anonymous' ? 2.5 : 1.25;
    console.log(
      `💰 Edge Function: Setting dollar amount to $${dollarAmount} for ${userId !== 'anonymous' ? 'authenticated' : 'anonymous'} user`
    );

    // Add userId to the key label if available
    const keyLabel = userId !== 'anonymous' ? `user-${userId}-${label}` : `anonymous-${label}`;
    console.log(`🏷️ Edge Function: Using label: ${keyLabel}`);

    console.log(`📤 Edge Function: Sending request to OpenRouter API with limit: ${dollarAmount}`);
    // Updated to use endpoint without trailing slash per OpenRouter API docs
    const response = await fetch('https://openrouter.ai/api/v1/keys', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provisioningKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: userId !== 'anonymous' ? `User ${userId} Session` : name,
        label: keyLabel,
        limit: dollarAmount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Edge Function: Error creating key:`, data);
      return new Response(JSON.stringify({ error: 'Failed to create key', details: data }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // OpenRouter API returns data in a nested structure
    // The key is at the top level, metadata in data object
    if (!data.key) {
      console.error(`❌ Edge Function: Unexpected API response format:`, data);
      return new Response(JSON.stringify({ error: 'Invalid API response format' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Enhanced logging for successful key creation
    // Format the response to combine top-level key with nested metadata
    const formattedResponse = {
      ...data.data, // Include all metadata from the data object
      key: data.key, // Add the key from the top level
    };

    console.log(`✅ EDGE FUNCTION: Successfully created key:`, {
      hash: formattedResponse.hash || 'unknown',
      label: formattedResponse.label || 'unknown',
      limit: formattedResponse.limit || 0,
      limitInCents: (formattedResponse.limit || 0) * 100,
      dollarAmount: dollarAmount,
      responseKeys: Object.keys(formattedResponse).join(', '),
    });

    return new Response(JSON.stringify(formattedResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Function to check credits for a specific key
async function handleCheckCredits(requestData, provisioningKey) {
  try {
    const { keyHash } = requestData;

    if (!keyHash) {
      return new Response(JSON.stringify({ error: 'Key hash is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`https://openrouter.ai/api/v1/keys/${keyHash}`, {
      headers: {
        Authorization: `Bearer ${provisioningKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to check credits', details: data }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Function to list keys
async function handleListKeys(requestData, provisioningKey) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/keys', {
      headers: {
        Authorization: `Bearer ${provisioningKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to list keys', details: data }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
