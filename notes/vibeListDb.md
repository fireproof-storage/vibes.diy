# Plan for User-Scoped Vibe ID Database Sync

## Objective
When a user is logged in and the `useVibes()` hook is called, ensure that every local Vibe ID (from `listLocalVibeIds`) has a corresponding document in a Fireproof database scoped to the user. Each document should have `_id: "fp.sync-<id>"`. Only create documents that do not already exist.

---

## Implementation Steps

### 1. Trigger Condition
- Run this logic only if `userId` is available (user is logged in).
- Wait for `listLocalVibeIds()` to finish loading.
- Ensure the Fireproof database for the user is ready.

### 2. Prepare User Database
- Use Fireproof's API to create/load a database named with the user ID, e.g., `vibespace-<userId>`.

### 3. Sync Vibe IDs
- For each ID from `listLocalVibeIds()`:
  - Compose the document ID as `fp.sync-<id>`.
  - Check if a document with that `_id` exists in the user database.
  - If it does not exist, create a new document: `{ _id: "fp.sync-<id>", created: Date.now(), userId: <userId>, vibeId: <id> }`.
- Batch these checks/creations for efficiency if possible.

### 4. Idempotency
- Do not overwrite or modify documents that already exist.
- Only create missing documents.

### 5. React Integration
- Add this logic to `useVibes.ts`, likely in a `useEffect` that depends on both `userId` and the loaded list of vibe IDs.
- Handle loading and error states gracefully.

### 6. Fireproof API Usage
- Use the core API (`fireproof(dbName)`) for direct document operations.
- Use `db.get(_id)` to check for existence.
- Use `db.put(doc)` to create a new document.

### 7. Testing and Edge Cases
- Test with users who have no vibe IDs, and with users who already have some or all documents present.
- Ensure no unnecessary writes occur.

---

## Example Pseudocode

```js
import { fireproof } from 'use-fireproof';

async function syncVibeIdsToUserDb(userId, vibeIds) {
  const db = fireproof(`vibespace-${userId}`);
  for (const id of vibeIds) {
    const docId = `fp.sync-${id}`;
    try {
      await db.get(docId); // Will throw if not found
    } catch {
      await db.put({ 
        _id: docId, 
        created: Date.now(), 
        userId: userId, 
        vibeId: id 
      });
    }
  }
}
```

---

## Next Steps
- Implement this logic in `useVibes.ts`.
- Ensure it only runs when the user is logged in and both the vibe IDs and user DB are ready.
- Optimize for batch operations if Fireproof supports it.
