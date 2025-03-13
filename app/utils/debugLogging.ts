/**
 * Debug logging utility for streaming content
 *
 * This file provides consistent logging for both tests and production code.
 * It enables tracking the flow of streaming content and component rendering
 * to ensure consistent behavior across environments.
 */

// Always enable debug in test environment
const DEBUG_ENABLED =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true';

// Force log output in tests
const FORCE_LOG_IN_TESTS = true;

// Simple counter for tracking streaming updates
let updateCount = 0;

// Component render counts to detect potential re-rendering issues
const renderCounts: Record<string, number> = {};

/**
 * Reset the update counter (typically at the start of a new stream)
 */
export function resetStreamingUpdateCount() {
  updateCount = 0;
}

/**
 * Check if we're in a test environment
 */
function isTestEnvironment() {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

/**
 * Log a streaming content update
 */
export function logStreamingUpdate(content: string, segmentsCount: number, streamingId?: string) {
  if (!DEBUG_ENABLED && !FORCE_LOG_IN_TESTS) return;

  const id = streamingId ? ` [${streamingId}]` : '';
  updateCount++;

  const message = `🔍 STREAM${id}: Update #${updateCount} - Content length=${content.length}, hasSegments=${segmentsCount > 0}`;

  // Format the output based on environment
  if (typeof window !== 'undefined') {
    // Browser environment
    console.debug(message);
  } else if (isTestEnvironment()) {
    // Test environment - write directly to stdout for cleaner output
    process.stdout.write(`\n${message}\n`);
  }
}

/**
 * Log segment details
 */
export function logSegmentDetails(segments: Array<{ type: string; content?: string }>) {
  if ((!DEBUG_ENABLED && !FORCE_LOG_IN_TESTS) || !segments?.length) return;

  segments.forEach((segment, i) => {
    const previewContent = segment.content
      ? `${segment.content.substring(0, 20)}${segment.content.length > 20 ? '...' : ''}`
      : '[empty]';

    const message = `🔍 SEGMENT ${i}: type=${segment.type}, content=${previewContent}`;

    if (typeof window !== 'undefined') {
      console.debug(message);
    } else if (isTestEnvironment()) {
      process.stdout.write(`\n${message}\n`);
    }
  });
}

/**
 * Log UI state decisions
 */
export function logUIState(
  componentName: string,
  contentVisible: boolean,
  segmentsCount: number,
  additionalInfo?: Record<string, any>
) {
  if (!DEBUG_ENABLED && !FORCE_LOG_IN_TESTS) return;

  // Track render counts
  renderCounts[componentName] = (renderCounts[componentName] || 0) + 1;

  const renderCount = renderCounts[componentName];
  const additionalInfoStr = additionalInfo
    ? `, ${Object.entries(additionalInfo)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`
    : '';

  const message = `🔍 UI STATE: ${componentName} render #${renderCount}, contentVisible=${contentVisible}, segmentsRendered=${segmentsCount}${additionalInfoStr}`;

  if (typeof window !== 'undefined') {
    console.debug(message);
  } else if (isTestEnvironment()) {
    process.stdout.write(`\n${message}\n`);
  }
}

/**
 * Log DOM verification for tests
 */
export function logDOMVerification(elementText: string, isFound: boolean) {
  if (!DEBUG_ENABLED && !FORCE_LOG_IN_TESTS) return;

  const message = `🔍 DOM CHECK: "${elementText}" is ${isFound ? 'FOUND' : 'NOT FOUND'} in document`;

  if (typeof window !== 'undefined') {
    console.debug(message);
  } else if (isTestEnvironment()) {
    process.stdout.write(`\n${message}\n`);
  }
}

/**
 * General debug log that works in any environment
 */
export function debugLog(message: string) {
  if (!DEBUG_ENABLED && !FORCE_LOG_IN_TESTS) return;

  if (typeof window !== 'undefined') {
    console.debug(message);
  } else if (isTestEnvironment()) {
    process.stdout.write(`\n${message}\n`);
  }
}

export default {
  resetStreamingUpdateCount,
  logStreamingUpdate,
  logSegmentDetails,
  logUIState,
  logDOMVerification,
  debugLog,
};
