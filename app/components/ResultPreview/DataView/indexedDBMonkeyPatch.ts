/**
 * IndexedDB monkey-patch utility for namespacing databases
 * This follows the same pattern as in iframe-template.html to ensure consistency
 * between the parent window and iframe contexts
 */

// Check if already patched to avoid double-patching
let isPatched = false;

/**
 * Apply the IndexedDB monkeypatch for the current window
 *
 * @param sessionId The session ID to use for namespacing
 */
export const applyIndexedDBPatch = (sessionId: string): void => {
  // Avoid double-patching
  if (isPatched) {
    return;
  }

  // Save the original method
  const originalIndexedDBOpen = indexedDB.open;

  // Apply the monkey patch
  indexedDB.open = function (name, ...args) {
    // Skip namespacing for non-Fireproof databases (must start with 'fp.')
    // This also implicitly skips databases like 'fp-keybag' that use a hyphen
    if (!name || !name.startsWith('fp.')) {
      return originalIndexedDBOpen.call(this, name, ...args);
    }

    // Skip namespacing for internal Vibes databases
    if (name.startsWith('fp.vibe-') || name.startsWith('fp.vibes-')) {
      return originalIndexedDBOpen.call(this, name, ...args);
    }

    // Skip if already namespaced (starts with vx-)
    if (name.includes('vx-')) {
      return originalIndexedDBOpen.call(this, name, ...args);
    }

    // Apply namespacing using the exact same pattern as in iframe-template.html
    // Insert the vx-sessionId into the database name instead of prefixing the whole name
    const dbNameWithoutPrefix = name.substring(3); // Remove 'fp.' prefix
    const namespacedName = 'fp.vx-' + sessionId + '-' + dbNameWithoutPrefix;
    return originalIndexedDBOpen.call(this, namespacedName, ...args);
  };

  // Mark as patched
  isPatched = true;
};
