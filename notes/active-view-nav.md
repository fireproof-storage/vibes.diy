# Navigation Rules for Active View

## Initial States & Transitions

### First Message Behavior

1. **Initial State**:

   - Path: Base path without app/code/data suffixes
   - Default view: Code preview (without altering URL path)

2. **When Code Starts Streaming**:

   - Display: Code view (mobile stay on chat)
   - Path: Should remain at base path (no /code suffix)
   - This allows the automatic transition to app view later

3. **When Preview Becomes Ready**:
   - Auto-navigate to: App view (/app) (That when mobile goes to app)
   - But only if URL doesn't have explicit /code or /data paths
   - Respect the user's explicit navigation choices

### Subsequent Messages & User Interaction

1. **After First Message**:

   - Default view: App view
   - When preview becomes ready again, should navigate to app view
   - But never override explicit user navigation to /code or /data

2. **Explicit Navigation**:
   - If user manually navigates to /code or /data, respect this choice
   - No auto-navigation should override these explicit choices

## Implementation Requirements

1. **URL Path Based Determination**:

   - Active view should be determined primarily by URL path
   - Fallback to state only when URL doesn't specify a view

2. **No View Parameter in Initial URL**:

   - The initial URL should not contain any view suffix
   - This is critical to enable auto-navigation to app view when ready

3. **Conditional Auto-Navigation**:
   - Only auto-navigate when not overriding explicit user choices
   - Check current path before redirecting to app view

# Advice about main branch

After reviewing our code changes and the documentation in notes/active-view-nav.md, there are a few subtle nuances that could be addressed more explicitly:

1. wasStreamingRef Behavior in Multiple Components
The implementation uses wasStreamingRef in both ViewState.ts and home.tsx to track streaming state transitions. However, it's not explicitly noted that this pattern appears in multiple places:

In home.tsx for controlling mobile preview visibility
In ViewState.ts for managing auto-navigation timing
This duplication means state transitions are being tracked independently, which could potentially lead to race conditions if these references get out of sync.

2. Caching of isMobileViewport() Calls
The isMobileViewport() function is called repeatedly in render cycles and effect dependencies. The function recalculates window dimensions on each call, but we don't have any mechanism to:

Cache the result during a render cycle
Respond to actual window resize events that would change the result
A potentially more efficient approach would be to use a resize listener with a state/ref to track viewport size changes.

3. User Expectations During Orientation Changes
We've handled the distinction between mobile and desktop, but there's no explicit handling for what happens during orientation changes on tablets, or when a user resizes their browser window across the 768px threshold. The current implementation will:

Potentially change behavior mid-session if window size crosses the threshold
Not remember previous user preferences if the viewport classification changes
4. Timing of previewReady vs Streaming End
The documentation doesn't explicitly address the potential race condition:

What if previewReady becomes true after streaming has already ended?
What if streaming ends after the preview is already ready?
The current implementation handles these cases, but the documentation could be clearer about the order of operations.

5. ResultPreviewHeaderContent Component Dependencies
The interaction between ResultPreviewHeaderContent.tsx and the useViewState hook isn't fully detailed. Specifically:

The component adds a layer of potential state manipulation beyond what's documented
It contains an effect that synchronizes activeView with displayView, potentially creating circular effects if not implemented carefully
6. Testing Considerations
The documentation doesn't mention the specifics of how these behaviors should be tested, particularly:

How to simulate mobile viewports in test environments
How to test the timing dependencies between streaming state and preview readiness
These nuances don't necessarily require code changes, but being aware of them could help in future maintenance and understanding potential edge cases in the application's behavior.
