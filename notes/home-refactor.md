# Home Page Refactor Plan: Flexbox Column Layout with True Footer

## Goal
Implement a layout for the home page that:
- Shows a welcoming hero and featured vibes before chat starts.
- Transitions smoothly to a chat-focused split view after a message is sent.
- Allows a list of recent projects to appear _below_ the chat input before any message is sent.
- Keeps the chat input visually anchored at the bottom, both before and after chat starts.
- Removes the `md:pb-[20vh]` padding hack and replaces it with a real, flexible content area.

## Key Components Involved
- `app/routes/home.tsx` (UnifiedSession)
- `app/components/AppLayout.tsx`
- `app/components/ChatInterface.tsx`
- `app/components/ChatInput.tsx`
- `app/components/SessionSidebar.tsx`
- `app/root.tsx` (global wrappers, not directly layout)

## High-Level Refactor Steps

### 1. **Redesign Layout Structure in AppLayout**
- Change the main chat column to a `flex flex-col h-full` layout.
- Remove the `md:pb-[20vh]` padding hack.
- Structure the column as:
  - Header (hero, or chat header)
  - Main content (featured vibes, recent projects, or chat messages)
  - Chat input (footer, always at the bottom)
  - Recent projects (conditionally rendered below input, before chat starts)
- Ensure the chat input is always at the bottom using `flex` and `justify-end` or a sticky/footer div.
- Enable smooth transitions between hero/featured and chat views using CSS transitions on flex children or conditional rendering with animation.

### 2. **Update UnifiedSession Logic**
- Add state to determine if the user is in the "pre-chat" (welcome) or "in-chat" (chat started) state.
- Pass props to AppLayout to control which sections are rendered:
  - Hero/featured/suggestions above chat input before chat starts.
  - Recent projects below chat input before chat starts.
  - Chat messages and preview after chat starts.
- Move recent projects logic into UnifiedSession and pass as a prop.

### 3. **Refactor ChatInterface**
- Ensure ChatInterface only renders the message list or welcome screen, not the input or recent projects.
- Remove any layout hacks that assume padding at the bottom.

### 4. **Refactor ChatInput**
- No major changes needed; just ensure it can be placed as a footer in the flex column.
- Optionally, allow passing additional content below the input (for recent projects).

### 5. **Handle Responsive and Split View**
- For split view (after chat starts):
  - Use `md:flex-row` to show chat and preview side-by-side.
  - Keep the chat column as a flex column, with chat input at the bottom.
- For mobile, keep everything stacked.
- Animate the width/visibility of the chat and preview columns for smooth transitions.

### 6. **SessionSidebar**
- No major changes required; ensure it overlays or pushes content as before.

### 7. **Testing & Polish**
- Test transitions between pre-chat and in-chat states.
- Test on mobile and desktop breakpoints.
- Ensure accessibility: input is always reachable, recent projects are keyboard-accessible.
- Remove all layout hacks and dead code related to old padding approach.

## Implementation Notes
- Use Tailwind's `flex-col`, `flex-grow`, `flex-shrink`, and `justify-end` utilities for proper layout.
- Use conditional rendering and CSS transitions for smooth state changes.
- Keep production code clean; do not add test-specific logic.

## Next Steps
1. Refactor `AppLayout` to use the new flex column structure.
2. Update `UnifiedSession` to control the layout state and pass correct props.
3. Add recent projects list logic and UI.
4. Remove all padding hacks and test thoroughly.

---

_This plan enables a maintainable, flexible layout that supports the new UX goals and removes the need for layout hacks._
