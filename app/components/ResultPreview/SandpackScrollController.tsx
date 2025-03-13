import { useEffect, useRef } from 'react';

interface SandpackScrollControllerProps {
  isStreaming: boolean;
}

const SandpackScrollController: React.FC<SandpackScrollControllerProps> = ({ isStreaming }) => {
  const lastScrollHeight = useRef(0);
  const lastScrollPosition = useRef(0);
  const isScrolling = useRef(false);
  const hasUserScrolled = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const isHighlighting = useRef(false);
  const lastLineRef = useRef<HTMLElement | null>(null);
  const scrollThreshold = useRef(40); // Smaller threshold for more responsive scrolling

  useEffect(() => {
    let primaryScroller: HTMLElement | null = null;

    if (!document.getElementById('highlight-style')) {
      const style = document.createElement('style');
      style.id = 'highlight-style';
      style.textContent = `
        .cm-line-highlighted {
          position: relative !important;
          border-left: 3px solid rgba(0, 137, 249, 0.6) !important; /* Slightly more visible border */
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
          animation: sparkleFlow 1.8s ease-in-out infinite !important; /* Slightly faster animation */
          pointer-events: none !important;
          z-index: -1 !important;
        }
        
        @keyframes sparkleFlow {
          0% { background-position: 0% 50%; opacity: 0.7; }
          50% { background-position: 100% 50%; opacity: 0.85; } /* Higher peak opacity */
          100% { background-position: 0% 50%; opacity: 0.7; }
        }
      `;
      document.head.appendChild(style);
    }

    const scrollToBottom = () => {
      if (!primaryScroller) return;
      isScrolling.current = true;

      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (!primaryScroller) {
          isScrolling.current = false;
          return;
        }
        
        // First immediate jump to get close
        primaryScroller.scrollTop = primaryScroller.scrollHeight;
        
        // Then use another requestAnimationFrame for smooth final adjustment
        requestAnimationFrame(() => {
          if (primaryScroller) {
            // Use scrollIntoView for smoother scrolling
            const lastElement = primaryScroller.lastElementChild;
            if (lastElement && lastElement instanceof HTMLElement) {
              lastElement.scrollIntoView({ block: 'end', behavior: 'auto' });
            } else {
              primaryScroller.scrollTop = primaryScroller.scrollHeight;
            }
            
            lastScrollHeight.current = primaryScroller.scrollHeight;
            lastScrollPosition.current = primaryScroller.scrollTop;
          }
          isScrolling.current = false;
        });
      });
    };

    const highlightLastLine = () => {
      if (!primaryScroller || !isStreaming) return;

      // Only update if streaming is active
      if (!isStreaming) return;

      // Avoid duplicate DOM operations
      const lines = Array.from(document.querySelectorAll('.cm-line'));
      if (lines.length === 0) return;

      // Find the last non-empty line
      let lastLine = null;
      let lastLineIndex = -1;

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i] as HTMLElement;
        const content = line.textContent || '';
        if (content.trim() && !content.includes('END OF CODE')) {
          lastLine = line;
          lastLineIndex = i;
          break;
        }
      }

      // Only update DOM if necessary (either no line highlighted or different line needs highlighting)
      if (lastLine && (lastLineRef.current !== lastLine)) {
        // Remove highlight from previous line if it exists and is different
        if (lastLineRef.current) {
          lastLineRef.current.classList.remove('cm-line-highlighted');
        }
        
        // Apply highlight to the found line
        lastLine.classList.add('cm-line-highlighted');
        lastLineRef.current = lastLine;
        
        // If this line is near the bottom, ensure it's visible
        const isNearEnd = lastLineIndex > lines.length - 5;
        if (isNearEnd && !hasUserScrolled.current) {
          scrollToBottom();
        }
      }
    };

    // Single animateHighlight function used throughout
    const animateHighlight = () => {
      if (!isStreaming) return;
      
      highlightLastLine();
      
      // Continue the animation loop
      animationFrameRef.current = requestAnimationFrame(animateHighlight);
    };

    const checkForScroller = setInterval(() => {
      if (primaryScroller) {
        clearInterval(checkForScroller);
        return;
      }

      const newScroller = document.querySelector('.cm-scroller');
      if (newScroller && newScroller instanceof HTMLElement) {
        primaryScroller = newScroller;
        scrollToBottom();
        setupContentObserver();
      }
    }, 100);

    const setupContentObserver = () => {
      if (!primaryScroller) return;

      const contentObserver = new MutationObserver((mutations) => {
        if (!primaryScroller) return;

        // Check if we've had any meaningful content changes
        const hasContentChanged = mutations.some(mutation => {
          return mutation.type === 'childList' || 
                 (mutation.type === 'characterData' && mutation.target.textContent?.trim().length);
        });

        if (!hasContentChanged) return;

        const newHeight = primaryScroller.scrollHeight;
        
        // Always attempt to highlight on content change if streaming
        if (isStreaming && !isHighlighting.current) {
          startHighlighting();
        }

        // More intelligent auto-scrolling during streaming
        if (newHeight !== lastScrollHeight.current) {
          const isNearBottom =
            primaryScroller.scrollTop + primaryScroller.clientHeight > 
            lastScrollHeight.current - scrollThreshold.current;

          // Auto-scroll if user hasn't scrolled up or is near bottom
          if (!hasUserScrolled.current || isNearBottom || 
              (isStreaming && primaryScroller.scrollTop > lastScrollPosition.current)) {
            scrollToBottom();
          }
        }

        lastScrollHeight.current = newHeight;
      });

      const handleScroll = () => {
        if (isScrolling.current || !primaryScroller) return;

        const currentPosition = primaryScroller.scrollTop;
        const scrollChange = Math.abs(currentPosition - lastScrollPosition.current);
        
        // Detect manual scrolling with more sensitivity
        if (scrollChange > 5) {
          hasUserScrolled.current = true;
          
          // Reset user scroll flag if they've scrolled close to the bottom
          const isAtBottom = 
            primaryScroller.scrollTop + primaryScroller.clientHeight >=
            primaryScroller.scrollHeight - scrollThreshold.current;
            
          if (isAtBottom) {
            hasUserScrolled.current = false;
          }
          
          lastScrollPosition.current = currentPosition;
        }
      };

      if (primaryScroller) {
        contentObserver.observe(primaryScroller, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        primaryScroller.addEventListener('scroll', handleScroll);
      }

      return () => {
        clearInterval(checkForScroller);
        stopHighlighting();
        contentObserver.disconnect();
        primaryScroller?.removeEventListener('scroll', handleScroll);
      };
    };

    // Helper to start highlighting
    const startHighlighting = () => {
      if (isHighlighting.current) return;
      isHighlighting.current = true;
      animationFrameRef.current = requestAnimationFrame(animateHighlight);
    };

    // Helper to stop highlighting
    const stopHighlighting = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isHighlighting.current = false;
      
      // Clean up highlights
      if (lastLineRef.current) {
        lastLineRef.current.classList.remove('cm-line-highlighted');
        lastLineRef.current = null;
      }
    };

    // Initial setup
    setTimeout(scrollToBottom, 100);
    
    // Start highlighting if streaming
    if (isStreaming) {
      startHighlighting();
    }

    return () => {
      clearInterval(checkForScroller);
      stopHighlighting();
    };
  }, [isStreaming]);

  useEffect(() => {
    // Handle streaming state changes
    if (!isStreaming) {
      // Clean up when streaming stops
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isHighlighting.current = false;
      
      // Remove highlight from any highlighted lines
      if (lastLineRef.current) {
        lastLineRef.current.classList.remove('cm-line-highlighted');
        lastLineRef.current = null;
      } else {
        document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
          el.classList.remove('cm-line-highlighted');
        });
      }
    } else if (!isHighlighting.current) {
      // Start highlighting when streaming starts
      isHighlighting.current = true;
      
      const animateHighlight = () => {
        if (!isStreaming) return;
        
        // Find and highlight the last line
        const scroller = document.querySelector('.cm-scroller');
        if (!scroller) return;
        
        // Remove highlight from previous line
        if (lastLineRef.current) {
          lastLineRef.current.classList.remove('cm-line-highlighted');
          lastLineRef.current = null;
        }
        
        // Find all code lines and highlight the last non-empty one
        const lines = Array.from(document.querySelectorAll('.cm-line'));
        let lastLine = null;
        
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i] as HTMLElement;
          const content = line.textContent || '';
          if (content.trim() && !content.includes('END OF CODE')) {
            lastLine = line;
            break;
          }
        }
        
        if (lastLine) {
          lastLine.classList.add('cm-line-highlighted');
          lastLineRef.current = lastLine as HTMLElement;
        }
        
        // Continue the animation loop if still streaming
        if (isStreaming) {
          animationFrameRef.current = requestAnimationFrame(animateHighlight);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animateHighlight);
    }
  }, [isStreaming]);

  return null;
};

export default SandpackScrollController;
