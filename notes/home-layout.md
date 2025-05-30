# Home Page Layout: Current State and Goals

## Goal

We want the home page to:

- Show a welcoming hero section and featured vibes (apps) when the user first lands.
- When the user enters a message (starts a chat), transition to a layout focused on the chat/app creation experience.
- **New Requirement:** Display a list of recent projects (vibes) _below the chat bubble_ when there is no message yet.
- The transition between the two layouts should be smooth and visually pleasing.

## Current State

### Initial Layout (before chat/message)

- Centered hero with heading ("Make apps with your friends"), subtitle, and featured vibes in a grid.
- Prompt input at the bottom, with suggested templates above it.
- Uses a large padding-bottom (`md:pb-[20vh]`) on the main container to reserve space for the chat bubble/transition, but this space is not usable for content (see screenshot 3).
- The padding hack means we can't easily put real content (like a recent projects list) in that area.

### After Message/Chat Starts

- Layout transitions to a split view: chat interface on the left, code/preview on the right (see screenshot 2 and `/notes/home-content.html`).
- The hero/featured section collapses, and the chat area expands.
- The transition is visually smooth, but the implementation relies on padding and flex tricks that limit content placement.

## Implementation Constraint

- The transition between the two layouts must remain smooth and visually appealing.
- The chat bubble/input must stay anchored at the bottom of the chat area, both before and after the transition.
- We want to avoid hacks (like large padding) that reserve unusable space.
- We need to be able to insert a list of recent projects _below_ the chat bubble when there is no message yet.

## Next Steps

- Evaluate layout strategies that allow for a real content area below the chat bubble, without breaking the smooth transition.
- Consider how to keep the chat input visually "anchored" while allowing flexible content below it.

---

**Options for next steps will be provided in this thread.**
