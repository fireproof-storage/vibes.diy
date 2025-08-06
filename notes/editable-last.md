# Editable Code Save - Simplified Logic

## What We Actually Want (Clarified)

**Simple Rule**: If the last message came from AI and wasn't because of a user edit, CREATE new messages.

### Current Confusing Logic

We've been overcomplicating this with "edit sessions" and timestamp comparisons. The actual requirement is much simpler.

### Desired Behavior

**CREATE new messages when:**

- The last message is from AI
- The last message does NOT have `isEditedCode: true`

**UPDATE existing messages when:**

- The last message is from AI
- The last message DOES have `isEditedCode: true` (user is continuing same edit)

### Example Flows

#### Flow 1: First edit after AI response

1. AI responds with new code → `type: 'ai', isEditedCode: false`
2. User saves edit → CREATE: "Edit by user" + "User changes" (`isEditedCode: true`)

#### Flow 2: Multiple edits in a row

1. AI responds → `type: 'ai', isEditedCode: false`
2. User saves → CREATE: "Edit by user" + "User changes" (`isEditedCode: true`)
3. User saves again → UPDATE: same "User changes" message (because last message has `isEditedCode: true`)

#### Flow 3: Edit after conversation

1. User edits → "User changes" (`isEditedCode: true`)
2. AI responds → `type: 'ai', isEditedCode: false`
3. User edits → CREATE new messages (because last AI message doesn't have `isEditedCode: true`)

## Simple Implementation

```typescript
const lastMessage = sortedDocs[sortedDocs.length - 1];
const shouldCreateNew =
  lastMessage?.type === 'ai' && !(lastMessage as AiChatMessageDocument)?.isEditedCode;
const shouldUpdate =
  lastMessage?.type === 'ai' && (lastMessage as AiChatMessageDocument)?.isEditedCode;

if (shouldCreateNew) {
  // CREATE new "Edit by user" + "User changes" pair
} else if (shouldUpdate) {
  // UPDATE existing "User changes" message
} else {
  // Fallback: CREATE new (if last message is user, etc.)
}
```

## Why We Got Confused

1. **Overthought "sessions"** - We tried to track when edit sessions start/end
2. **Timestamp complexity** - We compared AI content timestamps vs edit timestamps
3. **Multiple state sources** - We looked at selected messages, pending messages, etc.
4. **Live query issues** - We worried about incomplete data loading

## The Real Fix

Just look at the last message:

- **AI message without `isEditedCode`** → CREATE
- **AI message with `isEditedCode`** → UPDATE
- **Anything else** → CREATE (safe fallback)

## Steps to Fix

1. ✅ Identify the problem clearly (this document)
2. ⏭️ Implement the simple logic above
3. ⏭️ Test with the exact scenarios from the example flows
4. ⏭️ Remove all the complex session/timestamp logic we added

This should take 5 minutes to implement vs. the hours we've spent on the complex approach.
