# Second Message UX Improvements

Make it so when the user sends a second message, the view stays on the same tab. When the code is ready, the app code should bw swapped to the new version. Anytime the app loads (it sends an iframe message), the page should be swapped to the preview tab.

## State Transition Flow

The key state transition flow during code generation and preview:

1. `isStreaming=true`: When a chat message is being processed

   - Streaming begins for all message segments (code and non-code)

2. `codeReady=true`: When the complete code segment has been received

   - This can happen while other parts of the message are still streaming
   - At this point, we have the full, valid code to work with

3. Iframe Update: Triggered in IframeContent when `codeReady` is true

   - The iframe can start working with the new code even while post-code segments continue streaming
   - This allows the new app to load in parallel with remaining message content

4. `previewReady=true`: Signaled by the iframe via the 'preview-ready' message

   - The iframe sends this when its DOM content is loaded with the new app
   - This tells us the new app is fully rendered and interactive

5. `isStreaming=false`: When all message segments have completed streaming
   - This may happen after the app is already rendered in the preview

The correct sequence is often: `isStreaming=true → codeReady=true → iframe updates → previewReady=true → isStreaming=false`

## Current Behavior Issues

1. When a second message is sent:

   - Code resets to length zero
   - `isStreaming` becomes true
   - The view automatically changes to `/code` (line 45-46 in ResultPreview.tsx)
   - This forces a view change even if the user was viewing the preview or data tab

2. Spinning animation behavior:

   - The code icon spin animation is currently tied to `bundlingComplete && !previewReady`
   - Should instead spin whenever `isStreaming` is true and there are no segments after the code segment

3. App content persistence:
   - The app should stay on the old code until new code is ready
   - `codeReady` state is already handled somewhere but should be used consistently

## Planned Changes

### 1. Prevent Automatic View Change During Streaming

**File: `/app/components/ResultPreview/ResultPreview.tsx`**

Current code (lines 43-53):

```tsx
useEffect(() => {
  if (isStreaming) {
    // Reset to code view when streaming starts
    setActiveView('code');
  } else if (codeReady) {
    // Check URL path before switching to preview
    const path = window.location.pathname;

    // Only switch to preview if we're not on a specific route
    if (!path.endsWith('/code') && !path.endsWith('/data')) {
      setActiveView('preview');
    }
  }
}, [isStreaming, setActiveView, codeReady]);
```

Modified version:

```tsx
useEffect(() => {
  if (isStreaming) {
    // Do NOT change the view automatically when streaming starts
    // User should stay on their current view (preview, code, or data)

    // Optional: If there's no code at all (first run), then switch to code view
    if (!code || code.length === 0) {
      const path = window.location.pathname;
      // Only switch if we're not already on a specific route
      if (!path.endsWith('/code') && !path.endsWith('/data') && !path.endsWith('/app')) {
        setActiveView('code');
      }
    }
  } else if (codeReady) {
    // Check URL path before switching to preview
    const path = window.location.pathname;

    // Always switch to preview when code is ready
    setActiveView('preview');
  }
}, [isStreaming, setActiveView, codeReady, code]);
```

### 2. Update Code Icon Spin Animation

**File: `/app/components/ResultPreview/ResultPreviewHeaderContent.tsx`**

Current code (line 147):

```tsx
className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${bundlingComplete && !previewReady ? 'animate-spin-slow' : ''}`}
```

After investigation, we discovered that `previewReady` is the correct signal to use, as it's set to true when the iframe sends a 'preview-ready' message after the DOM content is loaded. The current implementation was almost correct, but we should fix the condition:

```tsx
className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isStreaming && !previewReady ? 'animate-spin-slow' : ''}`}
```

This ensures the spinning stops once the iframe has loaded and rendered the new app, which is the exact behavior we want.

### 3. Ensure App Stays on Old Code Until New Code is Ready

After investigating the code flow:

1. **Code loading process**:

   - In IframeContent.tsx (line 87-101), there's a check to load the iframe content only when `!isStreaming && codeReady`
   - This means the iframe only gets updated with new code when streaming is complete and code is ready
   - The component also checks if content has changed before reloading (`lastContentRef.current === appCode`)

2. **Preview ready event**:

   - The iframe template has a `pageIsLoaded()` function that sends a 'preview-ready' message to the parent when the DOM content is loaded
   - This event is captured in ResultPreview.tsx to set `previewReady` to true
   - This is a key signal that the new app has loaded and rendered

3. **Current implementation**:
   - The codeReady flag correctly prevents updating the iframe while streaming
   - previewReady is correctly used to indicate when the new app has loaded
   - No additional changes needed for this part as it's already implemented correctly

## Implementation Plan

1. First, modify `ResultPreview.tsx` to prevent auto-switching to code view during streaming
2. Update the code icon spin animation in `ResultPreviewHeaderContent.tsx`
3. Verify and potentially modify code in the streaming handlers to ensure old code persists until new code is fully ready
4. Test with multiple sequences to ensure behavior is consistent

## Testing Criteria

1. Start on the Preview tab, send a new message - view should remain on Preview
2. Start on the Code tab, send a new message - view should remain on Code
3. Start on the Data tab, send a new message - view should remain on Data
4. Code icon should spin while streaming is active
5. Preview should show previous app until new code is ready
6. When new code is ready, iframe should update and preview should show new app

## Implementation Hints

### Key Files to Modify

1. **ResultPreview.tsx**

   - This component manages the view state (preview/code/data)
   - Contains key useEffect that currently switches to code view when streaming starts
   - Houses the message handler for the iframe's 'preview-ready' event

2. **ResultPreviewHeaderContent.tsx**

   - Contains the code icon that needs the spinning animation
   - Update the condition to use `isStreaming && !codeReady`
   - Make sure codeReady is passed as a prop from parent component

3. **IframeContent.tsx**
   - **IMPORTANT FIX NEEDED**: Current implementation on line 87 has:
     ```tsx
     if (!isStreaming && codeReady && iframeRef.current) {
     ```
   - This should be changed to only check for `codeReady`:
     ```tsx
     if (codeReady && iframeRef.current) {
     ```
   - This allows the iframe to update as soon as code is ready, without waiting for streaming to complete

### Important Considerations

1. **Prop Passing Chain**

   - Make sure codeReady is correctly passed down from home.tsx → ResultPreview → ResultPreviewHeaderContent

2. **Race Conditions**

   - Be careful of race conditions where previewReady or codeReady states are updated out of sync
   - Add appropriate guards in useEffects to handle all possible state combinations

3. **Edge Cases**

   - First message vs second message behavior might differ
   - Empty code edge case should be handled (e.g., when there's no code to display)
   - Handle case where user switches tabs manually during streaming

4. **Testing Tips**
   - Test with both short and long-running streaming sessions
   - Test across all tabs to ensure consistent behavior
   - Verify that the iframe content only updates once per code generation (not multiple times)

## Appendix: Understanding `bundlingComplete` State

During the investigation, the purpose of the `bundlingComplete` state was clarified:

- **Initialization**: It's initialized to `true` in `ResultPreview.tsx` using `useState(true)`.
- **Setter (`setBundlingComplete`)**: The setter function is passed down to `IframeContent.tsx`.
- **Trigger**: `setBundlingComplete(true)` is called within `IframeContent.tsx` inside the `message` event handler specifically when the iframe posts a message with `type: 'preview-ready'`.
- **Usage**: The actual `bundlingComplete` state variable is _only_ used as a prop passed to `ResultPreviewHeaderContent.tsx`.
- **Effect**: In `ResultPreviewHeaderContent.tsx`, it's used in the condition for the code icon's spinning animation: ``className={`... ${bundlingComplete && !previewReady ? 'animate-spin-slow' : ''}`}``.

**Conclusion**: `bundlingComplete` is essentially a mirror of `previewReady` after the _first_ preview load, as it starts `true` and is set back to `true` when `previewReady` would become true. Its current use in the animation condition (`bundlingComplete && !previewReady`) seems redundant or potentially incorrect logic, as the animation should likely depend directly on the streaming and preview readiness states (`isStreaming` and `previewReady`).
