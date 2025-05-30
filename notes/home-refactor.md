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

- Extend the `AppLayoutProps` interface to include two new props:
  ```tsx
  heroComponent?: ReactNode; // Pre-chat hero + featured vibes
  recentProjectsComponent?: ReactNode; // Projects below input in pre-chat
  isPreChat?: boolean; // Controls which layout to show
  ```
- Change the main chat column to a true `flex flex-col h-full` layout:
  ```tsx
  <div className="flex h-full flex-col">
    {isPreChat && heroComponent ? (
      <header className="flex-shrink-0 transition-all duration-300">{heroComponent}</header>
    ) : (
      <header className="h-[4rem] flex-shrink-0">{headerLeft}</header>
    )}

    <main className="flex-grow overflow-auto">{chatPanel}</main>

    <footer className="flex-shrink-0">{chatInput}</footer>

    {isPreChat && recentProjectsComponent && (
      <aside className="flex-shrink-0 transition-all duration-300">{recentProjectsComponent}</aside>
    )}
  </div>
  ```
- Remove the `md:pb-[20vh]` padding hack completely.
- Use CSS transitions on height/opacity for smooth transitions between states.

### 2. **Update UnifiedSession Logic**

- Add clear state to determine if the user is in pre-chat or in-chat mode:
  ```tsx
  const isPreChat = chatState.docs.length === 0 && !urlSessionId && !hasSubmittedMessage;
  ```
- Update the existing `shouldUseFullWidthChat` variable to use this state:
  ```tsx
  const fullWidthChat = isPreChat;
  ```
- Create components for the new slots:

  ```tsx
  const heroComponent = isPreChat ? (
    <div className="...">{/* Hero content, featured vibes */}</div>
  ) : null;

  const recentProjectsComponent = isPreChat ? (
    <div className="...">{/* Recent projects list */}</div>
  ) : null;
  ```

- Pass these new components to AppLayout:
  ```tsx
  <AppLayout
    fullWidthChat={fullWidthChat}
    headerLeft={<ChatHeaderContent ... />}
    headerRight={...}
    chatPanel={<ChatInterface ... />}
    previewPanel={<ResultPreview ... />}
    chatInput={<ChatInput ... />}
    suggestionsComponent={
      isPreChat ? <QuickSuggestions ... /> : undefined
    }
    heroComponent={heroComponent}
    recentProjectsComponent={recentProjectsComponent}
    isPreChat={isPreChat}
    mobilePreviewShown={mobilePreviewShown}
  />
  ```

### 3. **Refactor ChatInterface**

- Ensure ChatInterface only renders the message list or welcome screen, not the input.
- Keep the existing structure but ensure it works with the new flex layout:
  ```tsx
  return (
    <div className="flex h-full flex-col">
      {messages.length > 0 ? (
        <div ref={messagesContainerRef} className="flex flex-grow flex-col-reverse overflow-y-auto">
          {memoizedMessageList}
        </div>
      ) : (
        <div className="flex flex-grow flex-col justify-between">
          <div className="flex-grow">
            <WelcomeScreen />
          </div>
        </div>
      )}
    </div>
  );
  ```
- Remove any layout hacks that assume padding at the bottom.

### 4. **Refactor ChatInput**

- Ensure it's properly contained in the footer section of the flex column.
- Make sure it has the correct flex-shrink-0 to maintain its height.
- Verify it stays anchored at the bottom through state transitions.

### 5. **Handle Responsive and Split View**

- For split view (after chat starts):
  - Use `md:flex-row` to show chat and preview side-by-side.
  - Keep the chat column as a flex column, with chat input at the bottom.
- For mobile, keep everything stacked.
- When animating height/flex values, be careful with:
  - Use `max-height` transitions rather than height when possible
  - Test both collapse and expand animations
  - Ensure smooth transitions on different screen sizes

### 6. **SessionSidebar**

- No major structural changes required.
- Ensure z-index is properly set to overlay the new layout:
  ```tsx
  <div
    ref={sidebarRef}
    className="bg-light-background-00 dark:bg-dark-background-00 fixed top-0 left-0 z-50 h-full shadow-lg transition-all duration-300 ..."
  >
  ```
- Verify that it doesn't push content or interfere with the footer positioning.

### 7. **Testing & Polish**

- Test transitions between pre-chat and in-chat states.
- Test on mobile and desktop breakpoints.
- Check mobile keyboard interaction: ensure the chat input doesn't get covered by virtual keyboard and that recent projects remain accessible.
- Test with screen readers to ensure accessibility: input and recent projects must be keyboard-navigable.
- Test in dark/light modes.
- Remove all layout hacks and dead code related to old padding approach.

## Implementation Notes

- Use Tailwind's semantic structure:
  - `flex-col` for column layout
  - `flex-grow` for expandable sections
  - `flex-shrink-0` for fixed-height sections
  - `overflow-auto` for scrollable areas
- Animate with care:
  - Height animations can be janky; use `max-height` or opacity/transform when possible
  - Use `transition-all duration-300 ease-in-out` for smooth transitions
- Maintain the existing `h-dvh` on the outer container to handle mobile viewport correctly.
- Keep production code clean; do not add test-specific logic.

## Next Steps

1. Refactor `AppLayout.tsx` to add the new props and implement the flex column structure.
2. Update `UnifiedSession` in `home.tsx` to control the layout state and pass the new props.
3. Create the recent projects list component and logic.
4. Remove all padding hacks and test thoroughly on all devices and screen sizes.

---

_This plan enables a maintainable, flexible layout that supports the new UX goals and removes the need for layout hacks._
