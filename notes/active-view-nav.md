# Navigation Rules for Active View

## Initial States & Transitions

### First Message Behavior

1. **Initial State**:
   - Path: Base path without app/code/data suffixes
   - Default view: Code preview (without altering URL path)

2. **When Code Starts Streaming**:
   - Display: Code view
   - Path: Should remain at base path (no /code suffix)
   - This allows the automatic transition to app view later

3. **When Preview Becomes Ready**:
   - Auto-navigate to: App view (/app)
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
