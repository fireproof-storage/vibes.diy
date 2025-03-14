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
};

interface SandpackScrollControllerProps {
  isStreaming: boolean;
  shouldEnableScrolling?: boolean;
  codeReady?: boolean;
  activeView?: 'preview' | 'code';
}

// Debug logging function to track scroll issues
const debugLog = (message: string, data?: any) => {
  console.log(`[ScrollDebug] ${message}`, data || '');
};

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
    
    debugLog(`Setting up scroller for the first time`, { height: staticRefs.scroller.scrollHeight });
    
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
        
        if (wasUserScrolled !== true) {
          debugLog(`User scroll state changed to true`);
        }

        // Check if scrolled to bottom
        const atBottom = 
          staticRefs.scroller.scrollTop + staticRefs.scroller.clientHeight >=
          staticRefs.scroller.scrollHeight - 50;
        
        if (atBottom) {
          staticRefs.hasUserScrolled = false;
          debugLog(`User scrolled to bottom, resetting hasUserScrolled`);
        }
      }
    };

    // Setup content observer with more efficient mutation handling
    if (staticRefs.contentObserver) {
      staticRefs.contentObserver.disconnect();
    }

    const contentObserver = new MutationObserver((mutations) => {
      if (!staticRefs.scroller) return;
      
      // Coalesce multiple mutations that happen close together
      if (staticRefs.isScrollingScheduled) return;
      staticRefs.isScrollingScheduled = true;
      
      // Debounce the scroll operation to handle rapid mutations
      setTimeout(() => {
        staticRefs.isScrollingScheduled = false;
        
        if (!staticRefs.scroller) return;
        
        const oldHeight = staticRefs.lastScrollHeight;
        const newHeight = staticRefs.scroller.scrollHeight;
        
        // Check if conditions still valid
        if (shouldScroll()) {
          highlightLastLine();
        } else {
          document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
            el.classList.remove('cm-line-highlighted');
          });
        }

        // Always try to scroll when height changes during streaming
        if (newHeight !== oldHeight && shouldScroll()) {
          scrollToBottom();
          staticRefs.lastScrollHeight = newHeight;
          return;
        }

        // Only check isNearBottom if height has changed
        if (newHeight === oldHeight) {
          return;
        }

        const isNearBottom =
          staticRefs.scroller.scrollTop + staticRefs.scroller.clientHeight > oldHeight - 100;

        if (!staticRefs.hasUserScrolled || isNearBottom) {
          scrollToBottom();
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
    
    debugLog(`Scroller setup complete`, { height: staticRefs.scroller.scrollHeight });
    
    // Do initial scroll and highlight
    if (shouldScroll()) {
      highlightLastLine();
      scrollToBottom();
    }
  };

  // Scroll to bottom function - simplified and more robust with debounce
  const scrollToBottom = () => {
    if (!staticRefs.scroller) return;
    
    if (staticRefs.scrollInProgress) {
      return;
    }
    
    const now = Date.now();
    if (now - staticRefs.lastScrollTime < 50) return; // Don't scroll too frequently
    staticRefs.lastScrollTime = now;
    
    staticRefs.isScrolling = true;
    staticRefs.scrollInProgress = true;

    // Ensure scrolling happens reliably with multiple animation frames
    let scrollAttempts = 0;
    const ensureScrolled = () => {
      if (!staticRefs.scroller || scrollAttempts >= 3) {
        staticRefs.isScrolling = false;
        staticRefs.scrollInProgress = false;
        return;
      }
      
      scrollAttempts++;
      staticRefs.scroller.scrollTop = staticRefs.scroller.scrollHeight;
      
      // Check if we need another attempt
      if (staticRefs.scroller.scrollTop < staticRefs.scroller.scrollHeight - 10) {
        requestAnimationFrame(ensureScrolled);
      } else {
        staticRefs.lastScrollHeight = staticRefs.scroller.scrollHeight;
        staticRefs.lastScrollPosition = staticRefs.scroller.scrollTop;
        staticRefs.isScrolling = false;
        staticRefs.scrollInProgress = false;
      }
    };
    
    requestAnimationFrame(ensureScrolled);
  };

  // Highlight last line function with debounce
  const highlightLastLine = () => {
    if (!staticRefs.scroller || !shouldScroll()) return;
    
    const now = Date.now();
    if (now - staticRefs.lastHighlightTime < 100) return; // Limit highlighting frequency
    staticRefs.lastHighlightTime = now;

    document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
      el.classList.remove('cm-line-highlighted');
    });

    const lines = Array.from(document.querySelectorAll('.cm-line'));
    let lastLine = null;

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const content = line.textContent || '';
      if (content.trim() && !content.includes('END OF CODE')) {
        lastLine = line;
        break;
      }
    }

    if (lastLine) {
      lastLine.classList.add('cm-line-highlighted');
      
      // Only scroll into view if we're in streaming mode
      if (shouldScroll()) {
        // Use a more reliable way to scroll to the element
        const rect = lastLine.getBoundingClientRect();
        if (rect && staticRefs.scroller) {
          const scrollerRect = staticRefs.scroller.getBoundingClientRect();
          if (rect.bottom > scrollerRect.bottom) {
            staticRefs.scroller.scrollTop = staticRefs.scroller.scrollHeight;
          }
        }
      }
    }
  };

  // Main effect to handle mounting and cleanup - debounced to prevent rapid remounting issues
  useEffect(() => {
    // Record mount timestamp
    const thisRenderTime = Date.now();
    
    // Clear any existing debounce timeout
    if (staticRefs.mountDebounceTimeout) {
      clearTimeout(staticRefs.mountDebounceTimeout);
    }
    
    // Debounce the mount setup to prevent thrashing on frequent remounts
    staticRefs.mountDebounceTimeout = setTimeout(() => {
      // Only proceed if this is still the latest mount
      if (thisRenderTime !== staticRefs.mountTimestamp) return;
      
      staticRefs.renderCount++;
      cleanupCalled.current = false;
      componentMounted.current = true;
      
      debugLog(`Component mounted, render count: ${staticRefs.renderCount}`);
      
      // Add the highlight styles if they don't exist
      if (!document.getElementById('highlight-style')) {
        const style = document.createElement('style');
        style.id = 'highlight-style';
        style.textContent = `
          .cm-line-highlighted {
            position: relative !important;
            border-left: 3px solid rgba(0, 137, 249, 0.6) !important;
            color: inherit !important;
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
            animation: sparkleFlow 1.8s ease-in-out infinite !important;
            pointer-events: none !important;
            z-index: -1 !important;
          }
          
          @keyframes sparkleFlow {
            0% { background-position: 0% 50%; opacity: 0.7; }
            50% { background-position: 100% 50%; opacity: 0.85; }
            100% { background-position: 0% 50%; opacity: 0.7; }
          }
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
    }, 150); // Debounce period - only set up if component stays mounted for 150ms
    
    // Record this mount as the latest
    staticRefs.mountTimestamp = thisRenderTime;

    // Cleanup function
    return () => {
      debugLog(`Component cleanup triggered, render count: ${staticRefs.renderCount}`);
      
      // Don't do expensive cleanup on rapid remounts
      if (Date.now() - thisRenderTime < 100) {
        debugLog(`Skipping cleanup due to short mount duration`);
        return;
      }
      
      // Mark component as unmounted
      cleanupCalled.current = true;
      componentMounted.current = false;
    };
  }, []); // Empty dependency array - we manage state independently

  // Function to update the highlight interval
  const updateHighlightInterval = () => {
    const shouldBeScrolling = shouldScroll();
    
    if (shouldBeScrolling) {
      if (!staticRefs.highlightInterval) {
        staticRefs.highlightInterval = setInterval(() => {
          // Check again inside interval in case conditions changed
          if (shouldScroll() && staticRefs.scroller) {
            highlightLastLine();
            scrollToBottom();
          }
        }, 200); // Less frequent interval to reduce CPU usage
      }
    } else if (staticRefs.highlightInterval) {
      clearInterval(staticRefs.highlightInterval);
      staticRefs.highlightInterval = null;
      
      // Clear highlights when not in streaming mode
      document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
        el.classList.remove('cm-line-highlighted');
      });
    }
  };

  // Effect for responding to condition changes - with debounce
  useEffect(() => {
    debugLog(`Conditions updated: isStreaming=${isStreaming}, codeReady=${codeReady}, activeView=${activeView}, shouldScroll=${shouldScroll()}`);
    
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
