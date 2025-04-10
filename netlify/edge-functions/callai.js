export default async (request, context) => {
  // Extract the path segment after /api/callai/
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const action = pathSegments[3]; // e.g., "create-key", "check-credits"

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
    } catch (e) {
      requestData = {};
    }

    const userId = requestData.userId || 'anonymous';

    // Access the secure provisioning key from environment variables
    const provisioningKey = Netlify.env.get('SERVER_OPENROUTER_PROV_KEY');

    if (!provisioningKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle different API actions
    switch (action) {
      case 'create-key':
        return await handleCreateKey(request, provisioningKey, userId);
      case 'check-credits':
        return await handleCheckCredits(request, provisioningKey);
      case 'list-keys':
        return await handleListKeys(request, provisioningKey);
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
async function handleCreateKey(request, provisioningKey, userId) {
  try {
    const requestData = await request.json();
    const {
      name = 'Session Key',
      label = `session-${Date.now()}`,
    } = requestData;
    
    // Set dollar amount based on user authentication status
    // Anonymous users get $0.50, logged-in users get $1.00
    const dollarAmount = userId !== 'anonymous' ? 1.0 : 0.5;

    // Add userId to the key label if available
    const keyLabel = userId !== 'anonymous' ? `user-${userId}-${label}` : `anonymous-${label}`;

    const response = await fetch('https://openrouter.ai/api/v1/keys/', {
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
      return new Response(JSON.stringify({ error: 'Failed to create key', details: data }), {
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

// Function to check credits for a specific key
async function handleCheckCredits(request, provisioningKey) {
  try {
    const { keyHash } = await request.json();

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
async function handleListKeys(request, provisioningKey) {
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
