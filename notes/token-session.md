# OpenRouter Token Session Management

## Overview

This document outlines the selected strategy for managing OpenRouter API credits in the Vibes DIY application. In this model, anonymous users receive 50 cents of initial credit, and must log in to receive additional credits when they run out. Each device/profile maintains one active session key that's managed through key rotation alongside authentication processes.

## Architecture: Managed Key Rotation Approach

The Vibes DIY application will use a managed key rotation approach where each device/profile gets one active API key at a time, with the key being rotated alongside authentication tokens. This approach balances user experience with financial risk management.

### Key Components

#### 1. One Key Per Device/Profile

- Each device or browser profile maintains one active OpenRouter API key
- Keys are stored securely in the client's local storage or IndexedDB
- When creating a new key, we query usage on existing keys to make informed decisions

#### 2. Key Creation and Management

For anonymous users, create a session key with a 50-cent limit:

```javascript
const response = await fetch('https://openrouter.ai/api/v1/keys/', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${PROVISIONING_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Anonymous Session Key',
    label: `anonymous-${deviceId}`, // Unique identifier
    limit: 0.5, // 50 cents limit
  }),
});
```

#### 3. Real-time Credit Checking

The `/api/v1/auth/key` endpoint provides real-time information about a key's status:

```javascript
const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
  headers: {
    Authorization: `Bearer ${sessionKey}`,
  },
});
// Response includes: limit, usage, limit_remaining
```

#### 4. Key Rotation Strategy

```javascript
// Example key rotation implementation
async function rotateApiKey(userId) {
  // 1. Query current key usage
  const currentKeyHash = getCurrentKeyHash(userId);
  if (currentKeyHash) {
    const keyInfo = await fetch(`https://openrouter.ai/api/v1/keys/${currentKeyHash}`, {
      headers: { Authorization: `Bearer ${PROVISIONING_API_KEY}` },
    });
    const data = await keyInfo.json();

    // If current key has barely been used, don't create a new one
    if (data.data.usage < 0.05) {
      // Less than 5 cents used
      return getCurrentKey(userId);
    }

    // Optionally disable the old key after creating a new one
    // (or set it to expire soon)
  }

  // 2. Create a new key
  const response = await fetch('https://openrouter.ai/api/v1/keys/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PROVISIONING_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `User Key - ${new Date().toISOString()}`,
      label: `user-${userId}-${Date.now()}`,
      limit: 0.5, // 50 cents
      // Could add expiration metadata
    }),
  });

  const newKey = await response.json();
  storeKeyForUser(userId, newKey);
  return newKey;
}
```

### Key Lifecycle

1. **Creation**: New session key created for anonymous users with 50-cent limit
2. **Usage**: Key is used until a significant portion is consumed
3. **Login**: When user logs in, additional credits are provided through either:
   - A new key (if existing key is significantly used)
   - Continued use of existing key (if usage is minimal)
4. **Expiration**: Keys naturally expire after a set period

## Financial Considerations

**Important**: Credits are only consumed when a key is actually used, not when it's created. This has important implications:

- Each provisioned key represents potential financial liability until used/expired
- If a user creates multiple sessions but never uses them, no actual costs are incurred
- The aggregate potential liability equals the sum of all outstanding key limits

This approach balances risk in several ways:

- Small per-key limits (50 cents) contain the maximum exposure per device
- Key rotation alongside auth tokens provides natural opportunities to evaluate usage
- Trust in typical user behavior while implementing monitoring for abuse patterns

## Best Practices

1. **Use meaningful key labels**: Include timestamps, user IDs, and device identifiers
2. **Implement graceful UX**: When credits run out, provide clear path to sign up/login
3. **Set reasonable expiration periods**: Limit the lifespan of inactive keys
4. **Monitor usage patterns**: Track unusual spikes in key creation or consumption

## Conclusion

The managed key rotation approach provides the best balance for the Vibes DIY application:

1. One key per device/profile, rotated alongside authentication processes
2. Simple implementation with minimal accounting overhead
3. Natural financial risk management through small-value keys
4. Seamless user experience across devices

By letting small-value keys run their course and only creating new ones when necessary, the system minimizes complexity while still protecting against excessive usage. The `/api/v1/auth/key` endpoint provides real-time credit information to show users their remaining balance, and the rotation strategy ensures that users receive appropriate credits as they engage with the application.
