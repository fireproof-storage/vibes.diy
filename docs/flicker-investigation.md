# Code Flicker Investigation Results

## Issue

Code flickering during AI streaming responses was reported, suspected to be introduced by recent Monaco Editor changes.

## Investigation Summary

**Root Cause Identified:** Commit `c3356cf` - "Enhance Monaco Editor syntax error detection for save button (#191)"

### Technical Details

The commit added extensive real-time syntax error detection that conflicts with streaming updates:

1. **Multiple Event Listeners** on Monaco Editor:
   - `onDidChangeMarkers` - triggers on every marker change
   - `onDidChangeModelContent` - triggers on every content change during streaming

2. **Debounced Syntax Checking** with complex timing:
   - `scheduleSyntaxCheck()` with 50ms and 500ms delays
   - `syntaxErrorCheckTimeoutId` management
   - Multiple simultaneous checks during rapid content updates

3. **Real-time State Updates**:
   - `onSyntaxErrorChange(errorCount)` calls during streaming
   - LED indicator and save button state changes
   - Format-on-type and format-on-paste during content updates

4. **Marker Filtering Logic**:
   - `monaco.editor.getModelMarkers()` calls on every change
   - TypeScript language service validation during streaming
   - Real-time error counting and UI updates

### Problem Analysis

During AI streaming:

- Content updates continuously via `onContent(content)` callbacks
- Monaco Editor content changes rapidly
- Each content change triggers syntax checking
- Multiple timers and state updates compete with streaming updates

### Key Files Affected

- `app/components/ResultPreview/IframeContent.tsx` (lines 273-332) - syntax error monitoring
- `app/components/ResultPreview/SaveButton.tsx` - error state display
- `app/components/ResultPreview/setupMonacoEditor.ts` - Monaco configuration

## Resolution

**GitHub Issue Filed:** [#230 - Code flickering during streaming introduced by Monaco Editor syntax error detection](https://github.com/VibesDIY/vibes.diy/issues/230)

The issue documents the specific technical details and suggests investigation areas for developers to fix the flickering behavior.

## Recommendations

1. **Disable syntax checking during streaming** - Pause error detection when `isStreaming` is true
2. **Debounce streaming updates** - Reduce frequency of Monaco content updates during streaming
3. **Optimize marker listeners** - Reduce frequency of syntax error checks
4. **Separate streaming and editing modes** - Different Monaco configurations for streaming vs editing

---

_Investigation completed on 2025-08-13_
