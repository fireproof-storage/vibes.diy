import { useEffect, useRef } from 'react';

// Create static refs that persist across component remounts
// These will maintain state even when the component is unmounted and remounted
const staticRefs = {
  scroller: null as HTMLElement | null,
  contentObserver: null as MutationObserver | null,
  checkForScrollerInterval: null as NodeJS.Timeout | null,
  scrollIntervalRef: null as NodeJS.Timeout | null,
  isScrolling: false,
  lastScrollHeight: 0,
  lastScrollTop: 0,
  lastUserInteraction: 0,
  scrollLock: false, // Prevents scroll jumps during content changes
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
  // Keep component-level refs for React's hook rules
  const componentMounted = useRef(false);
  const propsRef = useRef({ isStreaming, codeReady, activeView });
  const preventScrollRef = useRef<((e: Event) => boolean) | null>(null);

  // Update props ref when they change
  useEffect(() => {
    propsRef.current = { isStreaming, codeReady, activeView };
  }, [isStreaming, codeReady, activeView]);

  // Simple check if we should be auto-scrolling
  const shouldAutoScroll = () => {
    const { isStreaming, codeReady, activeView } = propsRef.current;
    return isStreaming && !codeReady && activeView === 'code';
  };
  
  // Check if we should lock scrolling
  const shouldLockScroll = () => {
    return shouldAutoScroll();
  };

  // Safely scroll to bottom with minimal side effects
  const scrollToBottom = (force = false) => {
    if (!staticRefs.scroller) return;
    
    if (staticRefs.isScrolling && !force) return;
    
    staticRefs.isScrolling = true;
    
    // Set a scroll lock to prevent unwanted scroll resets 
    // during the actual scrolling operation
    staticRefs.scrollLock = true;
    
    // Use requestAnimationFrame to ensure smooth scrolling
    requestAnimationFrame(() => {
      if (staticRefs.scroller && componentMounted.current) {
        // Use smooth scrolling behavior
        staticRefs.scroller.style.scrollBehavior = 'smooth';
        staticRefs.scroller.scrollTop = staticRefs.scroller.scrollHeight;
        staticRefs.lastScrollHeight = staticRefs.scroller.scrollHeight;
        staticRefs.lastScrollTop = staticRefs.scroller.scrollTop;
      }
      
      // Release locks after a small delay to ensure the scroll completes
      setTimeout(() => {
        staticRefs.isScrolling = false;
        staticRefs.scrollLock = false;
        // Reset scroll behavior to auto after scrolling is done
        if (staticRefs.scroller) {
          staticRefs.scroller.style.scrollBehavior = 'auto';
        }
      }, 50);
    });
  };

  // Setup the scroller observer
  const setupScroller = (scroller: HTMLElement) => {
    if (!scroller) return;
    
    staticRefs.scroller = scroller;
    
    // Clean up any previous observers
    if (staticRefs.contentObserver) {
      staticRefs.contentObserver.disconnect();
    }
    
    // Setup unified scroll prevention handler
    const preventScroll = (e: Event) => {
      if (shouldLockScroll()) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      return true;
    };
    
    // Store in ref for cleanup access
    preventScrollRef.current = preventScroll;
    
    // Add event listeners for scroll prevention - use proper TypeScript casting
    scroller.addEventListener('wheel', preventScroll, { capture: true, passive: false } as AddEventListenerOptions);
    scroller.addEventListener('touchmove', preventScroll, { capture: true, passive: false } as AddEventListenerOptions);
    
    // Setup content observer with simplified mutation handling
    const contentObserver = new MutationObserver((mutations) => {
      // Skip if component not mounted or no scroller
      if (!componentMounted.current || !staticRefs.scroller) return;
      
      // Skip if scroll is locked (in the middle of an operation)
      if (staticRefs.scrollLock) return;
      
      // Check if content height has changed
      const newHeight = staticRefs.scroller.scrollHeight;
      const heightChanged = newHeight !== staticRefs.lastScrollHeight;
      
      // Auto-scroll immediately on content change if we should auto-scroll
      if (shouldAutoScroll()) {
        scrollToBottom();
      }
      
      staticRefs.lastScrollHeight = newHeight;
    });
    
    // Observe all relevant content changes
    contentObserver.observe(scroller, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    
    staticRefs.contentObserver = contentObserver;
    
    // Do initial scroll if needed
    if (shouldAutoScroll()) {
      scrollToBottom();
    }
  };
  
  // Setup or tear down the periodic scrolling
  const setupScrollInterval = () => {
    // Clear any existing interval
    if (staticRefs.scrollIntervalRef) {
      clearInterval(staticRefs.scrollIntervalRef);
      staticRefs.scrollIntervalRef = null;
    }
    
    // If we should auto-scroll, set up the interval
    if (shouldAutoScroll() && staticRefs.scroller) {
      // Scroll 4 times per second (every 250ms)
      staticRefs.scrollIntervalRef = setInterval(() => {
        if (componentMounted.current && shouldAutoScroll()) {
          scrollToBottom();
        }
      }, 250);
    }
  };

  // Main effect to handle mounting and setup
  useEffect(() => {
    componentMounted.current = true;
    
    // Add the highlight styles if they don't exist (for test compatibility)
    if (!document.getElementById('highlight-style')) {
      const style = document.createElement('style');
      style.id = 'highlight-style';
      style.textContent = `
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
      `;
      document.head.appendChild(style);
    }
    
    // Find the scroller element
    const findAndSetupScroller = () => {
      const scroller = document.querySelector('.cm-scroller');
      if (scroller && scroller instanceof HTMLElement) {
        setupScroller(scroller);
        return true;
      }
      return false;
    };
    
    // Try to find scroller immediately
    if (!findAndSetupScroller()) {
      // If not found, set up an interval to keep trying
      staticRefs.checkForScrollerInterval = setInterval(() => {
        if (findAndSetupScroller()) {
          // Once found, clear the interval
          if (staticRefs.checkForScrollerInterval) {
            clearInterval(staticRefs.checkForScrollerInterval);
            staticRefs.checkForScrollerInterval = null;
          }
        }
      }, 100);
    }
    
    // Set up the scroll interval
    setupScrollInterval();
    
    // Cleanup function
    return () => {
      componentMounted.current = false;
      
      // Clear intervals
      if (staticRefs.checkForScrollerInterval) {
        clearInterval(staticRefs.checkForScrollerInterval);
        staticRefs.checkForScrollerInterval = null;
      }
      
      if (staticRefs.scrollIntervalRef) {
        clearInterval(staticRefs.scrollIntervalRef);
        staticRefs.scrollIntervalRef = null;
      }
      
      // Disconnect observer
      if (staticRefs.contentObserver) {
        staticRefs.contentObserver.disconnect();
      }
      
      // Remove event listeners if scroller exists
      if (staticRefs.scroller && preventScrollRef.current) {
        // Need to provide the same functions to removeEventListener
        staticRefs.scroller.removeEventListener('wheel', preventScrollRef.current, { capture: true } as EventListenerOptions);
        staticRefs.scroller.removeEventListener('touchmove', preventScrollRef.current, { capture: true } as EventListenerOptions);
      }
    };
  }, []);

  // Effect for responding to prop changes
  useEffect(() => {
    // Reset the scroll interval when props change
    setupScrollInterval();
    
    // If conditions change and we should auto-scroll now, do it
    if (shouldAutoScroll() && staticRefs.scroller) {
      scrollToBottom();
    }
  }, [isStreaming, codeReady, activeView]);

  return null;
};

export default SandpackScrollController;
