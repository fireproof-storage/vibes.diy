import { useEffect, useRef } from 'react';

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
  const lastScrollHeight = useRef(0);
  const lastScrollPosition = useRef(0);
  const isScrolling = useRef(false);
  const hasUserScrolled = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const isHighlighting = useRef(false);
  const lastLineRef = useRef<HTMLElement | null>(null);
  const scrollThreshold = useRef(40);
  const scrollIntervalRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<number | null>(null);
  const contentObserverRef = useRef<MutationObserver | null>(null);
  const scrollListenerRef = useRef<((e: Event) => void) | null>(null);
  // Track if we've already cleaned up to avoid duplicate cleanup
  const hasCleanedUp = useRef(false);
  // Store the active view value to avoid dependency list issues
  const activeViewRef = useRef(activeView);
  
  // Update the ref when activeView changes
  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);
  
  // Helper function to check if we're in code view
  const isCodeView = () => activeViewRef.current === 'code';
  
  // Helper function to check if we're in preview view
  const isPreviewView = () => activeViewRef.current === 'preview';
  
  // Helper function to determine if we should be pinning to bottom
  const shouldPinToBottom = () => isStreaming && !codeReady;
  
  // Add the highlight styles regardless of streaming state
  useEffect(() => {
    // Create highlighting styles if needed
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
    
    return () => {
      // We're not removing the style on unmount as other instances may need it
      // The test will handle cleanup if needed
    };
  }, []);
  
  // Comprehensive cleanup function to stop all automatic scrolling
  const stopAllScrolling = () => {
    // If we've already cleaned up, don't do it again
    if (hasCleanedUp.current) return;
    
    // Mark as cleaned up
    hasCleanedUp.current = true;
    
    // Clear the scroll interval
    if (scrollIntervalRef.current !== null) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    
    // Clear the check interval
    if (checkIntervalRef.current !== null) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    // Cancel any pending animation frames
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Remove the content observer
    if (contentObserverRef.current) {
      contentObserverRef.current.disconnect();
      contentObserverRef.current = null;
    }
    
    // Remove scroll listener if it exists
    const primaryScroller = document.querySelector('.cm-scroller');
    if (primaryScroller && scrollListenerRef.current) {
      primaryScroller.removeEventListener('scroll', scrollListenerRef.current);
      scrollListenerRef.current = null;
    }
    
    // Clear highlighting
    if (lastLineRef.current) {
      lastLineRef.current.classList.remove('cm-line-highlighted');
      lastLineRef.current = null;
    }
    
    // Reset other state
    isHighlighting.current = false;
  };
  
  // Effect that watches for changes to the scroll state conditions
  useEffect(() => {
    // If we should be pinning to bottom, set up scrolling
    if (shouldPinToBottom() && isPreviewView()) {
      // Only reset the cleanup flag if we're going to start scrolling
      hasCleanedUp.current = false;
      
      // Set up scrolling - the main useEffect below will handle this
    } else {
      // Otherwise stop all scrolling (not streaming or code is ready)
      stopAllScrolling();
    }
    
    return () => {
      if (!shouldPinToBottom()) {
        stopAllScrolling();
      }
    };
  }, [isStreaming, codeReady, activeView]);
  
  // Main useEffect for scroll handling
  useEffect(() => {
    // Don't do anything if code is ready, we're in code view, or we've already cleaned up
    if (codeReady || isCodeView() || hasCleanedUp.current) {
      return;
    }
    
    let primaryScroller: HTMLElement | null = null;
    
    // Use nested requestAnimationFrame for smoother scrolling 
    // This pattern was effective in previous implementations
    const scrollToBottom = () => {
      if (!primaryScroller || codeReady || isCodeView() || hasCleanedUp.current) return;
      
      isScrolling.current = true;
      
      // First frame to prepare for scroll
      requestAnimationFrame(() => {
        if (!primaryScroller || codeReady || isCodeView() || hasCleanedUp.current) {
          isScrolling.current = false;
          return;
        }
        
        // First set the scroll position - quick jump
        primaryScroller.scrollTop = primaryScroller.scrollHeight;
        
        // Then second frame for the final positioning - ensures browser has rendered properly
        requestAnimationFrame(() => {
          if (!primaryScroller || codeReady || isCodeView() || hasCleanedUp.current) {
            isScrolling.current = false;
            return;
          }
          
          // Ensure we're at the bottom - this second call helps with the "blinking up" issue
          primaryScroller.scrollTop = primaryScroller.scrollHeight;
          
          // Update our tracking references
          lastScrollHeight.current = primaryScroller.scrollHeight;
          lastScrollPosition.current = primaryScroller.scrollTop;
          
          isScrolling.current = false;
        });
      });
    };
    
    // Find the scroller element
    const findScrollerAndScroll = () => {
      if (codeReady || isCodeView() || hasCleanedUp.current) return false;
      
      const scroller = document.querySelector('.cm-scroller');
      if (scroller && scroller instanceof HTMLElement) {
        primaryScroller = scroller;
        
        // Only set up scrolling if we're not in a cleaned up state
        if (!codeReady && isPreviewView() && !hasCleanedUp.current) {
          // Immediately scroll to bottom
          scrollToBottom();
          
          // Set up content observation
          setupContentObserver();
          
          // Only set up interval if we're streaming and not ready
          if (scrollIntervalRef.current === null && isStreaming && !codeReady) {
            scrollIntervalRef.current = window.setInterval(() => {
              if (codeReady || isCodeView() || hasCleanedUp.current) {
                if (scrollIntervalRef.current !== null) {
                  clearInterval(scrollIntervalRef.current);
                  scrollIntervalRef.current = null;
                }
                return;
              }
              
              scrollToBottom();
            }, 500); // Less frequent to reduce vibration chances
          }
        }
        
        return true;
      }
      return false;
    };
    
    // Setup a mutation observer to detect content changes
    const setupContentObserver = () => {
      if (!primaryScroller || codeReady || isCodeView() || hasCleanedUp.current) return;
      
      // Create a content observer
      const contentObserver = new MutationObserver((mutations) => {
        // Skip if code is ready, we're in code view, or we've cleaned up
        if (codeReady || isCodeView() || hasCleanedUp.current) {
          contentObserver.disconnect();
          return;
        }
        
        // Check if the content actually changed
        const hasContentChanged = mutations.some(mutation => {
          return mutation.type === 'childList' || 
                 (mutation.type === 'characterData' && mutation.target.textContent?.trim().length);
        });
        
        if (!hasContentChanged) return;
        
        // Content changed, scroll to bottom
        scrollToBottom();
        
        // Start highlighting if needed
        if (isStreaming && !isHighlighting.current && !hasCleanedUp.current) {
          startHighlighting();
        }
      });
      
      contentObserver.observe(primaryScroller, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      
      // Store observer for cleanup
      contentObserverRef.current = contentObserver;
      
      // Add a scroll event listener that forces scroll to bottom if user tries to scroll up
      // But only if streaming and not ready
      if (isStreaming && !codeReady && isPreviewView() && !hasCleanedUp.current) {
        const handleScroll = (e: Event) => {
          // Skip if already scrolling programmatically, code is ready, in code view, or we've cleaned up
          if (isScrolling.current || codeReady || isCodeView() || hasCleanedUp.current) return;
          
          if (primaryScroller) {
            // Always keep scroll at the bottom during streaming
            scrollToBottom();
          }
        };
        
        // Store listener for potential cleanup
        scrollListenerRef.current = handleScroll;
        
        primaryScroller.addEventListener('scroll', handleScroll);
      }
    };
    
    // Check for the scroller until we find it
    if (!codeReady && isPreviewView() && !hasCleanedUp.current) {
      checkIntervalRef.current = window.setInterval(() => {
        if (codeReady || isCodeView() || hasCleanedUp.current) {
          if (checkIntervalRef.current !== null) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
          return;
        }
        
        if (findScrollerAndScroll()) {
          if (checkIntervalRef.current !== null) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
        }
      }, 100);
    }
    
    // Try immediately as well
    findScrollerAndScroll();
    
    // Highlight the last line of code
    const highlightLastLine = () => {
      if (!primaryScroller || codeReady || isCodeView() || hasCleanedUp.current) return; 

      // Get all code lines
      const lines = Array.from(document.querySelectorAll('.cm-line'));
      if (lines.length === 0) return;

      // Find the last non-empty line
      let lastLine = null;

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i] as HTMLElement;
        const content = line.textContent || '';
        if (content.trim() && !content.includes('END OF CODE')) {
          lastLine = line;
          break;
        }
      }

      // Only update if necessary
      if (lastLine && (lastLineRef.current !== lastLine)) {
        // Remove previous highlight
        if (lastLineRef.current) {
          lastLineRef.current.classList.remove('cm-line-highlighted');
        }
        
        // Add highlight to new line
        lastLine.classList.add('cm-line-highlighted');
        lastLineRef.current = lastLine;
      }
    };

    // Animation loop for highlighting using requestAnimationFrame
    const animateHighlight = () => {
      if (!isStreaming || codeReady || isCodeView() || hasCleanedUp.current) {
        // Stop animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }
      
      highlightLastLine();
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animateHighlight);
    };

    // Start highlight animation
    const startHighlighting = () => {
      if (isHighlighting.current || codeReady || isCodeView() || hasCleanedUp.current) return;
      isHighlighting.current = true;
      animationFrameRef.current = requestAnimationFrame(animateHighlight);
    };

    // Start highlighting if streaming and not code ready
    if (isStreaming && !codeReady && isPreviewView() && !hasCleanedUp.current) {
      startHighlighting();
    }
    
    // Do an initial scroll after a timeout to ensure content is loaded
    if (!codeReady && isPreviewView() && !hasCleanedUp.current) {
      setTimeout(() => {
        if (!codeReady && isPreviewView() && !hasCleanedUp.current) {
          scrollToBottom();
        }
      }, 100);
    }

    // Cleanup function
    return () => {
      stopAllScrolling();
    };
  }, [isStreaming, shouldEnableScrolling, codeReady]);

  return null;
};

export default SandpackScrollController;
