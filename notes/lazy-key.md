# Lazy API Key Implementation Plan

## Background

The `jchris/lazy-key3` branch implements a more optimized approach to API key handling, using on-demand provisioning instead of eager loading. This document outlines how to implement these improvements on the `selem/auth` branch.

## Current Analysis

- `selem/auth` branch already has ~90% of the "lazy-key3" logic:

  - Rate-limit back-off mechanism
  - Shared `pendingKeyRequest` for deduplication
  - Hash continuity for key tracking
  - localStorage validation and age checking

- **Missing piece**: An imperative entry point (`ensureApiKey`) that components can use to fetch a key only when needed, rather than the current "eager fetch on mount" approach.

- `useSimpleChat.ts` still assumes a key will appear automatically; it calls `checkCredits()` after `apiKey` is set and treats "needsNewKey" as an error state.

## Goal

Implement **on-demand provisioning**: The very first time a component (chat send, credit check, etc.) needs a key, it asks for it; otherwise, it re-uses what's already in memory or localStorage. No background fetches on component mount.

## Implementation Plan

### 1. Modify `app/hooks/useApiKey.ts`

a. Remove the current `useEffect` that automatically calls `fetchNewKey()`.

b. Add `ensureApiKey` as a `useCallback`:

```typescript
const ensureApiKey = useCallback(async (): Promise<{ key: string; hash: string }> => {
  // 1. Return cached apiKey if present
  if (apiKey?.key && !isLoading) {
    return apiKey;
  }

  // 2. Check localStorage
  const storedKeyData = checkLocalStorageForKey();
  if (storedKeyData && isValidKey(storedKeyData)) {
    setApiKey({ key: storedKeyData.key, hash: storedKeyData.hash });
    return { key: storedKeyData.key, hash: storedKeyData.hash };
  }

  // 3. Fetch new key if needed
  try {
    const hashToUse = storedKeyData?.hash;
    return await fetchNewKeyInternal(userId, hashToUse);
  } catch (error) {
    // Handle fallback logic
    if (storedKeyData?.key) {
      return { key: storedKeyData.key, hash: storedKeyData.hash || 'unknown' };
    }
    throw error;
  }
}, [apiKey, userId, isLoading]);
```

c. Update return signature:

```typescript
return {
  apiKey: apiKey?.key,
  apiKeyObject: apiKey, // Full object for internal use
  isLoading,
  error,
  refreshKey,
  ensureApiKey, // New imperative function
};
```

d. Keep `refreshKey` and all existing validation/rate-limit logic.

### 2. Update Consumers

a. Modify `app/hooks/useSimpleChat.ts`:

- Replace direct `apiKey` reads with explicit calls to `ensureApiKey()`:
  ```typescript
  const { key: apiKey } = await ensureApiKey();
  ```
- Remove the effect that calls `checkCredits()` when `apiKey` appears
- Call `checkCredits()` right after `ensureApiKey()` succeeds
- Inside `refresh()`, keep existing logic but switch to `await refreshKey()` or `await ensureApiKey()`

b. Update other hooks/utilities that expect `apiKey` on mount:

- Tests, scripts, and other components should call `ensureApiKey()` when they need the key

### 3. UI Feedback

- Keep `isLoading` from `useApiKey` so callers can show spinners while awaiting `ensureApiKey()`
- Preserve existing `needsLogin`/`needsNewKey` flags:
  - Set them when `ensureApiKey()` throws 401/403 errors
  - Keep the UI prompts that guide users to log in or refresh their key

### 4. Test Updates

- Update key-related tests to `await ensureApiKey()` instead of relying on the initial effect
- Existing rate-limit and hash-continuity tests remain valid
- Add new tests for the lazy-loading behavior to ensure keys are only fetched when needed

### 5. No Backend Work Required

The Netlify edge function already accepts an optional `hash` parameter, so no backend work is necessary.

## Benefits

Once implemented, the app will:

- Avoid an API round-trip for most page loads
- Only prompt/refresh when a user actually tries to chat or inspect credits
- Maintain the same resilience and rate-limit behavior introduced in `jchris/lazy-key3`
- Reduce unnecessary API calls, improving performance and reducing server load

## Implementation Order

1. Implement `ensureApiKey` in `useApiKey.ts`
2. Update `useSimpleChat` to use `ensureApiKey`
3. Update other consumers
4. Test and verify behavior
