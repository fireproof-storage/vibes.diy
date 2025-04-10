import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook for managing throttled AI message updates
 * @param mergeAiMessage - Function to update AI message content
 * @returns Object with throttled update function and refs
 */
export function useThrottledUpdates(mergeAiMessage: (update: { text: string }) => void) {
  const isProcessingRef = useRef<boolean>(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledMergeAiMessage = useCallback(
    (content: string) => {
      // If we're already processing a database operation, don't trigger more updates
      if (isProcessingRef.current) {
        return;
      }

      // Clear any pending timeout to implement proper debouncing
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }

      // Throttle parameters
      const THROTTLE_DELAY = 10; // Increased from 10ms for better stability
      const MIN_UPDATE_INTERVAL = 50; // Minimum time between updates

      // Add minimum time between updates check
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

      // Calculate delay - use a longer delay if we've updated recently
      let delay = THROTTLE_DELAY;

      if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
        // If we've updated too recently, use adaptive delay
        delay = Math.max(
          MIN_UPDATE_INTERVAL - timeSinceLastUpdate + THROTTLE_DELAY,
          MIN_UPDATE_INTERVAL
        );
      }

      // Schedule update with calculated delay
      updateTimeoutRef.current = setTimeout(() => {
        // Record update time before the actual update
        lastUpdateTimeRef.current = Date.now();

        // Update with the content passed directly to this function
        mergeAiMessage({ text: content });
      }, delay);
    },
    [mergeAiMessage]
  );

  // Cleanup any pending updates when the component unmounts
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, []);

  return { throttledMergeAiMessage, isProcessingRef, updateTimeoutRef };
}
