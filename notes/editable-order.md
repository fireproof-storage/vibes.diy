# Editable Code Save Behavior

## Intended Behavior

The save functionality for edited code should follow this pattern:

### CREATE vs UPDATE Logic

**CREATE new messages when:**

- There has been AI activity/conversation since the last user edit session
- This marks the start of a new editing session
- Creates new "Edit by user" + "User changes: [code]" message pair

**UPDATE existing messages when:**

- User is making multiple saves in a row without AI conversation in between
- This is continuing the same editing session
- Updates the existing "User changes: [code]" message with new code

### Example Flow

1. **AI generates new code response** → Marks new edit session needed
2. **User saves edited code** → CREATE new "Edit by user" + "User changes" messages
3. **User saves again immediately** → UPDATE the existing "User changes" message
4. **User saves again** → UPDATE the same "User changes" message
5. **AI responds with new code** → Marks new edit session needed
6. **User saves** → CREATE new message pair again

### Key Points

- Each "editing session" starts after AI provides new content
- Multiple saves within the same editing session update the same message
- AI activity triggers the need for a new editing session
- This prevents chat clutter while preserving edit history at logical boundaries

### Current Issue

The logic currently only checks if there are messages after the last edit, but it should track whether there's been AI activity since the last edit session started, not since the last individual edit save.

## Implementation

Need to track:

- When AI last provided new content/code
- Whether current edit is start of new session or continuation
- Use AI response timestamps vs edit session start timestamps, not individual save timestamps

## Diagnostic Logging

The enhanced logging provides comprehensive analysis of edit sessions:

### 🔍 EDIT SESSION ANALYSIS

- **Message counts**: Shows total messages, AI content vs user edits
- **Timestamps**: Compares last AI content vs last edit timestamps
- **Session state**: Determines if there's been AI activity since last edit
- **Expected behavior**: Shows what SHOULD happen vs what WILL happen

### 📅 CONVERSATION TIMELINE

- **Full chronological view**: Every message with timestamps and types
- **Visual markers**: 🔴 Last, 🟡 2nd, 🟢 3rd for easy identification
- **Message types**: Distinguishes `ai-edit` from regular `ai` messages
- **Content preview**: First 35 characters of each message

### 🎯 FINAL DECISION

- **Current logic**: Shows why the current decision was made
- **Expected logic**: Shows what the decision SHOULD be based on sessions
- **Gap identification**: Highlights where current logic differs from intended behavior

### How This Helps Debug

1. **Identifies timing issues**: See exact timestamps of AI content vs edits
2. **Reveals session boundaries**: Shows when new edit sessions should start
3. **Exposes logic gaps**: Current logic vs intended session-based logic
4. **Provides visual timeline**: Easy to understand message flow and relationships
5. **Shows decision reasoning**: Clear explanation of why UPDATE vs CREATE was chosen

This logging reveals that the current logic checks "messages after edit" but should check "AI activity since edit session started".
