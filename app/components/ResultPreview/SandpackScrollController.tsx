import { useEffect, useRef } from 'react';

// Create static refs that persist across component remounts
// These will maintain state even when the component is unmounted and remounted
const staticRefs = {
  lastScrollHeight: 0,
  lastScrollPosition: 0,
  isScrolling: false,
  hasUserScrolled: false,
  highlightInterval: null as NodeJS.Timeout | null,
  contentObserver: null as MutationObserver | null,
  checkForScrollerInterval: null as NodeJS.Timeout | null,
  scroller: null as HTMLElement | null,
  scrollInProgress: false,
  renderCount: 0,
  scrollerSetupComplete: false,
  lastScrollTime: 0,
  mountTimestamp: 0,
  mountDebounceTimeout: null as NodeJS.Timeout | null,
  isScrollingScheduled: false,
  lastHighlightTime: 0,
  currentHighlightedLine: null as HTMLElement | null,
  lastLineIndex: -1, // Track the last line index to avoid unnecessary DOM operations
  documentLineCount: 0, // Track the total number of lines for adaptive timing
  rafID: null as number | null, // Store animation frame ID for synchronized animations
  pendingHighlight: false, // Flag to indicate pending highlight operation
  pendingScroll: false, // Flag to indicate pending scroll operation
  documentHeight: 0, // Track document height for optimization
};

interface SandpackScrollControllerProps {
  isStreaming: boolean;
  shouldEnableScrolling?: boolean;
  codeReady?: boolean;
  activeView?: 'preview' | 'code';
}

const SandpackScrollController: React.FC<SandpackScrollControllerProps> = ({ 
  isStreaming,
  shouldEnableScrolling = isStreaming, // Default to isStreaming if not provided
  codeReady = false,
  activeView = 'preview' // Default to preview view
}) => {
  // We still keep component-level refs for React's hook rules,
  // but they're just pointers to our static refs
  const componentMounted = useRef(false);
  const cleanupCalled = useRef(false);
  // Local refs to hold the props
  const propsRef = useRef({ isStreaming, codeReady, activeView });

  // Update props ref when they change
  useEffect(() => {
    propsRef.current = { isStreaming, codeReady, activeView };
  }, [isStreaming, codeReady, activeView]);

  // Simple check if we should be scrolling
  const shouldScroll = () => {
    // Use the values from propsRef to ensure we're using the latest props
    const { isStreaming, codeReady, activeView } = propsRef.current;
    return isStreaming && !codeReady && activeView === 'code';
  };

  // Setup the scroller observer only once it's found - with debounce
  const setupScrollerOnce = () => {
    if (staticRefs.scrollerSetupComplete || !staticRefs.scroller) return;
        
    // Setup scroll listener with throttling
    const handleScroll = () => {
      if (staticRefs.isScrolling || !staticRefs.scroller) return;

      const now = Date.now();
      if (now - staticRefs.lastScrollTime < 50) return; // Throttle to max 20 events per second
      staticRefs.lastScrollTime = now;

      const currentPosition = staticRefs.scroller.scrollTop;
      const delta = Math.abs(currentPosition - staticRefs.lastScrollPosition);
      
      if (delta > 10) {
        const wasUserScrolled = staticRefs.hasUserScrolled;
        staticRefs.hasUserScrolled = true;
        staticRefs.lastScrollPosition = currentPosition;
        
        

        // Check if scrolled to bottom
        const atBottom = 
          staticRefs.scroller.scrollTop + staticRefs.scroller.clientHeight >=
          staticRefs.scroller.scrollHeight - 50;
        
        if (atBottom) {
          staticRefs.hasUserScrolled = false;
        }
      }
    };

    // Setup content observer with more efficient mutation handling
    if (staticRefs.contentObserver) {
      staticRefs.contentObserver.disconnect();
    }

    const contentObserver = new MutationObserver((mutations) => {
      if (!staticRefs.scroller) return;
      
      // Early exit if we've recently handled mutations
      if (staticRefs.isScrollingScheduled) return;
      staticRefs.isScrollingScheduled = true;
      
      // Debounce the scroll operation to handle rapid mutations
      setTimeout(() => {
        staticRefs.isScrollingScheduled = false;
        
        if (!staticRefs.scroller) return;
        
        const oldHeight = staticRefs.lastScrollHeight;
        const newHeight = staticRefs.scroller.scrollHeight;
        staticRefs.documentHeight = newHeight;
        
        // Update line count
        const lineElements = document.querySelectorAll('.cm-line');
        staticRefs.documentLineCount = lineElements.length;
        
        // Schedule operations for next animation frame
        if (shouldScroll()) {
          staticRefs.pendingHighlight = true;
          staticRefs.pendingScroll = newHeight !== oldHeight;
          scheduleAnimationFrame();
        } else if (staticRefs.currentHighlightedLine) {
          // Only clear highlight if we're not in scroll mode anymore
          fadeOutHighlight(staticRefs.currentHighlightedLine);
          staticRefs.currentHighlightedLine = null;
          staticRefs.lastLineIndex = -1;
        }

        // Only check isNearBottom if height has changed
        if (newHeight === oldHeight) {
          return;
        }

        const isNearBottom =
          staticRefs.scroller.scrollTop + staticRefs.scroller.clientHeight > oldHeight - 100;

        if (!staticRefs.hasUserScrolled || isNearBottom) {
          staticRefs.pendingScroll = true;
          scheduleAnimationFrame();
        }

        staticRefs.lastScrollHeight = newHeight;
      }, 10); // Small delay to coalesce rapid mutations
    });

    contentObserver.observe(staticRefs.scroller, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    
    staticRefs.scroller.addEventListener('scroll', handleScroll);
    staticRefs.contentObserver = contentObserver;
    staticRefs.scrollerSetupComplete = true;
    
    
    // Do initial scroll and highlight
    if (shouldScroll()) {
      highlightLastLine();
      scrollToBottom();
    }
  };

  // Helper function to fade out a highlight
  const fadeOutHighlight = (element: HTMLElement) => {
    element.classList.add('cm-line-fade-out');
    setTimeout(() => {
      element.classList.remove('cm-line-highlighted', 'active', 'cm-line-fade-out');
    }, 1500);
  };

  // Schedule a single animation frame for both scroll and highlight operations
  const scheduleAnimationFrame = () => {
    if (staticRefs.rafID !== null) return; // Already scheduled
    
    staticRefs.rafID = requestAnimationFrame(() => {
      staticRefs.rafID = null;
      
      if (!componentMounted.current || !staticRefs.scroller) return;
      
      // Execute both operations in the same frame if needed
      if (staticRefs.pendingHighlight) {
        staticRefs.pendingHighlight = false;
        highlightLastLine();
      }
      
      if (staticRefs.pendingScroll) {
        staticRefs.pendingScroll = false;
        scrollToBottom();
      }
    });
  };

  // Scroll to bottom function - simplified
  const scrollToBottom = () => {
    if (!staticRefs.scroller) return;
    
    if (staticRefs.scrollInProgress) {
      staticRefs.pendingScroll = true;
      scheduleAnimationFrame();
      return;
    }
    
    // Throttle scrolling
    const now = Date.now();
    if (now - staticRefs.lastScrollTime < 100) {
      staticRefs.pendingScroll = true;
      scheduleAnimationFrame();
      return;
    }
    staticRefs.lastScrollTime = now;
    
    staticRefs.isScrolling = true;
    staticRefs.scrollInProgress = true;

    // Ensure scrolling happens reliably
    staticRefs.scroller.scrollTop = staticRefs.scroller.scrollHeight;
    
    // Update state after scrolling
    staticRefs.lastScrollHeight = staticRefs.scroller.scrollHeight;
    staticRefs.lastScrollPosition = staticRefs.scroller.scrollTop;
    staticRefs.isScrolling = false;
    staticRefs.scrollInProgress = false;
  };

  // Highlight last line function - SCAN DISABLED, only scrolling enabled
  const highlightLastLine = () => {
    if (!staticRefs.scroller || !shouldScroll()) return;
    
    // Simple throttling - skip if called too frequently
    const now = Date.now();
    const throttleInterval = 250; // Fixed throttle interval
    
    if (now - staticRefs.lastHighlightTime < throttleInterval) {
      staticRefs.pendingHighlight = true;
      scheduleAnimationFrame();
      return;
    }
    staticRefs.lastHighlightTime = now;

    // DISABLED FOR PERF TESTING - Skip the line scanning entirely
    /*
    // Get all lines
    const lines = document.querySelectorAll('.cm-line');
    if (lines.length === 0) return;
    
    // Always scan from the end for the last non-empty line
    let lastLine = null;
    let lastLineIdx = -1;
    
    // Simple scan from the end for the last non-empty line
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i] as HTMLElement;
      const content = line.textContent || '';
      if (content.trim() && !content.includes('END OF CODE')) {
        lastLine = line;
        lastLineIdx = i;
        break;
      }
    }
    */

    // Skip finding last line for perf testing
    const lastLine = null;
    const lastLineIdx = -1;

    // If the last line is the same as before, no need to update DOM
    if (lastLine === staticRefs.currentHighlightedLine) {
      return;
    }
    
    // Fade out previous highlight if it exists
    if (staticRefs.currentHighlightedLine) {
      // DISABLED FOR PERF TESTING - Don't apply visual effects
      // fadeOutHighlight(staticRefs.currentHighlightedLine);
      staticRefs.currentHighlightedLine.classList.remove('cm-line-highlighted', 'active', 'cm-line-fade-out');
    }
    
    // Add highlight to new line with fade-in effect - DISABLED FOR PERF TESTING
    if (lastLine) {
      // Still track the current line but don't apply visual effects
      // lastLine.classList.add('cm-line-highlighted');
      staticRefs.currentHighlightedLine = lastLine;
      staticRefs.lastLineIndex = lastLineIdx;
      
      // DISABLED FOR PERF TESTING - Don't apply visual effects
      // Trigger a reflow before adding the active class for transition to work
      // void lastLine.offsetWidth;
      
      // Add active class after a very short delay to ensure transition works
      // setTimeout(() => {
      //   if (lastLine && lastLine.isConnected) {
      //     lastLine.classList.add('active');
      //   }
      // }, 1);
    }
    
    // Always enable scrolling for perf testing, regardless of current line
    if (shouldScroll() && !staticRefs.hasUserScrolled) {
      staticRefs.pendingScroll = true;
      scheduleAnimationFrame();
    }
  };

  // Main effect to handle mounting and cleanup
  useEffect(() => {
    // Record mount timestamp
    const thisRenderTime = Date.now();
    
    // Clear any existing debounce timeout
    if (staticRefs.mountDebounceTimeout) {
      clearTimeout(staticRefs.mountDebounceTimeout);
      staticRefs.mountDebounceTimeout = null;
    }
    
    staticRefs.renderCount++;
    cleanupCalled.current = false;
    componentMounted.current = true;
        
    // Add the highlight styles if they don't exist
    if (!document.getElementById('highlight-style')) {
      const style = document.createElement('style');
      style.id = 'highlight-style';
      style.textContent = `
        /* TEMPORARILY DISABLED FOR PERF TESTING */
        /*
        .cm-line-highlighted {
          position: relative !important;
          border-left: 3px solid rgba(0, 137, 249, 0.6) !important;
          color: inherit !important;
          transition: border-color 0.4s ease-in-out !important;
        }
        
        .cm-line-highlighted::before {
          content: "" !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: linear-gradient(
            90deg, 
            rgba(0, 128, 255, 0.12) 0%, 
            rgba(224, 255, 255, 0.2) 50%, 
            rgba(0, 183, 255, 0.12) 100%
          ) !important;
          background-size: 200% 100% !important;
          pointer-events: none !important;
          z-index: -1 !important;
          opacity: 0 !important;
          transition: opacity 1ms ease-in-out !important;
        }
        
        /* Simple animation for all document sizes */
        .cm-line-highlighted.active::before {
          opacity: 1 !important;
          animation: sparkleFlow 2s ease-in-out infinite !important;
        }
        
        /* Simple animation keyframes */
        @keyframes sparkleFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        /* Fade out class with transition */
        .cm-line-fade-out {
          transition: border-color 1.5s cubic-bezier(0.25, 0.1, 0.25, 1) !important;
          border-left-color: rgba(0, 137, 249, 0.2) !important;
        }
        
        .cm-line-fade-out::before {
          opacity: 0 !important;
          transition: opacity 1.5s cubic-bezier(0.25, 0.1, 0.1, 1) !important;
        }
        */
      `;
      document.head.appendChild(style);
    }

    // If we already have a scroller, use it
    if (staticRefs.scroller) {
      setupScrollerOnce();
    }
    
    // Otherwise, check for it periodically
    if (!staticRefs.checkForScrollerInterval) {
      staticRefs.checkForScrollerInterval = setInterval(() => {
        if (staticRefs.scroller) return;
        
        const newScroller = document.querySelector('.cm-scroller');
        if (newScroller && newScroller instanceof HTMLElement) {
          staticRefs.scroller = newScroller;
          setupScrollerOnce();
        }
      }, 100);
    }

    // Update highlight interval based on current conditions
    updateHighlightInterval();
    
    // Record this mount as the latest
    staticRefs.mountTimestamp = thisRenderTime;

    // Cleanup function
    return () => {      
      // Cancel any pending animation frame
      if (staticRefs.rafID !== null) {
        cancelAnimationFrame(staticRefs.rafID);
        staticRefs.rafID = null;
      }
      
      // Mark component as unmounted
      cleanupCalled.current = true;
      componentMounted.current = false;
    };
  }, []); // Empty dependency array - we manage state independently

  // Function to update the highlight interval - optimized for performance
  const updateHighlightInterval = () => {
    const shouldBeScrolling = shouldScroll();
    
    if (shouldBeScrolling) {
      if (!staticRefs.highlightInterval) {
        // Use a coordinated update approach for both highlighting and scrolling
        let lastFrameTime = 0;
        
        const updateAnimations = (timestamp: number) => {
          if (!shouldScroll() || !componentMounted.current) {
            if (staticRefs.rafID !== null) {
              cancelAnimationFrame(staticRefs.rafID);
              staticRefs.rafID = null;
            }
            return;
          }
          
          // Fixed throttle interval
          const interval = 300; // 300ms between updates
          
          if (timestamp - lastFrameTime > interval) {
            lastFrameTime = timestamp;
            
            if (staticRefs.scroller) {
              // Set pending flags for both operations
              staticRefs.pendingHighlight = true;
              if (!staticRefs.hasUserScrolled) {
                staticRefs.pendingScroll = true;
              }
              // And then schedule them in a synchronized frame
              scheduleAnimationFrame();
            }
          }
          
          // Schedule next animation check
          staticRefs.rafID = requestAnimationFrame(updateAnimations);
        };
        
        // Start the animation frame loop
        staticRefs.rafID = requestAnimationFrame(updateAnimations);
        
        // Store the cleanup function in the highlight interval
        staticRefs.highlightInterval = {
          clear: () => {
            if (staticRefs.rafID !== null) {
              cancelAnimationFrame(staticRefs.rafID);
              staticRefs.rafID = null;
            }
          }
        } as unknown as NodeJS.Timeout;
      }
    } else if (staticRefs.highlightInterval) {
      // Check if it's a regular interval or our custom object
      if ('clear' in staticRefs.highlightInterval) {
        (staticRefs.highlightInterval as unknown as { clear: () => void }).clear();
      } else {
        clearInterval(staticRefs.highlightInterval);
      }
      
      staticRefs.highlightInterval = null;
      
      // Cancel any pending animation frame
      if (staticRefs.rafID !== null) {
        cancelAnimationFrame(staticRefs.rafID);
        staticRefs.rafID = null;
      }
      
      // Clear highlights when not in streaming mode
      if (staticRefs.currentHighlightedLine) {
        fadeOutHighlight(staticRefs.currentHighlightedLine);
        staticRefs.currentHighlightedLine = null;
      }
    }
  };

  // Effect for responding to condition changes - with debounce
  useEffect(() => {    
    // Don't immediately react to prop changes - debounce them
    const timeoutId = setTimeout(() => {
      // Update interval based on conditions
      updateHighlightInterval();
      
      // Perform immediate scroll and highlight if needed
      if (shouldScroll() && staticRefs.scroller) {
        highlightLastLine();
        scrollToBottom();
      }
    }, 100); // Small debounce to prevent rapid changes from causing issues
    
    return () => clearTimeout(timeoutId);
  }, [isStreaming, codeReady, activeView]);

  return null;
};

export default SandpackScrollController;
