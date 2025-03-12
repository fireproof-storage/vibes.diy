The remaining issues are:

- the diff is too big against our previous state: 6c7b0ca5
  - we only want to do logic changes, not style changes
  - explain any style or copy changes you see


- the final state (loaded session url) is great, but streaming is not working on home

## investigation notes

## Route Consolidation Proposal: Combining home.tsx and session.tsx

### Current Architecture Issues

The current architecture has two nearly identical routes (home.tsx and session.tsx) that share:
- Almost identical component structure
- Similar state management and hooks usage
- Duplicate code for handling streaming content, code generation, and sharing

This duplication has led to:
1. Inconsistent behavior between routes (streaming works in session.tsx but not in home.tsx)
2. Complex transition logic that breaks the streaming experience
3. Maintenance challenges as changes need to be applied in two places

### Solution Approach

The home and session routes should be consolidated into a single unified route that:
1. Handles both initial state (no sessionId) and session state (with sessionId) 
2. Uses URL parameters to determine whether to load an existing session
3. Maintains a continuous user experience during the entire lifecycle

### Implementation Considerations

1. **URL Structure**:
   - `/session` - Initial state, creates a new session on first prompt
   - `/session/:sessionId` - Loads a specific session
   - Use React Router parameters for seamless transitions

2. **Session State Management**:
   - A single component detects sessionId parameter changes
   - Loads appropriate session or creates new one based on URL
   - History API updates URL without page reload when session is created

3. **Streaming Optimization**:
   - Removes the need for redirect between routes during streaming
   - Ensures continuous streaming experience from prompt to completion
   - Simplifies state management by avoiding complex transitions

4. **Code Organization**:
   - Move shared functionality to custom hooks
   - Single implementation of ResultPreview integration
   - Unified approach to code extraction and dependency handling

This consolidation will greatly simplify the codebase, ensure consistent behavior, and provide a more seamless experience particularly during streaming operations.

## New Goals

1. **Simplify Streaming Logic**
   - Remove unnecessary streaming state flags throughout the application
   - Display components should not need to know about streaming state
   - Only use streaming indicators for UI elements that need to show progress

2. **Improve Code Display Flow**
   - Always show the most recent code, whether streaming or static
   - Prioritize content display over state management complexity
   - Remove conditional rendering that delays content visibility

3. **Prevent Premature Navigation**
   - Fix immediate redirect from root path
   - Only navigate to session routes when explicitly required

4. **Reduce Component Complexity**
   - Components should focus on their core responsibilities
   - Remove streaming-specific logic where possible
   - Apply consistent patterns for code display and updates
