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
  // Tracking refs from main branch
  const lastScrollHeight = useRef(0);
  const lastScrollPosition = useRef(0);
  const isScrolling = useRef(false);
  const hasUserScrolled = useRef(false);
  
  // Our additional tracking refs
  const animationFrameRef = useRef<number | null>(null);
  const lastLineRef = useRef<HTMLElement | null>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const checkForScrollerIntervalRef = useRef<number | null>(null);
  
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
    };
  }, []);
  
  // Simple check if we should be scrolling (combines our condition with main branch logic)
  const shouldScroll = () => {
    return isStreaming && !codeReady && activeView === 'code';
  };
  
  // Main scrolling and highlighting effect from main branch
  useEffect(() => {
    // Clean up function - defined at the top to avoid reference errors
    const cleanup = () => {
      // Clear all timers
      if (checkForScrollerIntervalRef.current) {
        window.clearInterval(checkForScrollerIntervalRef.current);
        checkForScrollerIntervalRef.current = null;
      }
      
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Disconnect observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      
      // Remove event listeners
      if (scrollerRef.current) {
        scrollerRef.current.removeEventListener('scroll', () => {});
      }
      
      // Clear highlights
      if (lastLineRef.current) {
        lastLineRef.current.classList.remove('cm-line-highlighted');
        lastLineRef.current = null;
      }
      
      // Reset state
      hasUserScrolled.current = false;
    };
    
    // Don't do anything if we're not supposed to be scrolling
    if (!shouldScroll()) {
      cleanup();
      return;
    }
    
    // Main branch's scrollToBottom function
    const scrollToBottom = () => {
      if (!scrollerRef.current) return;
      
      isScrolling.current = true;
      requestAnimationFrame(() => {
        if (scrollerRef.current) {
          scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
          lastScrollHeight.current = scrollerRef.current.scrollHeight;
          lastScrollPosition.current = scrollerRef.current.scrollTop;
        }
        isScrolling.current = false;
      });
    };
    
    // Main branch's highlight function with our improvements
    const highlightLastLine = () => {
      if (!scrollerRef.current || !shouldScroll()) return;
      
      // Clear previous highlights
      if (lastLineRef.current) {
        lastLineRef.current.classList.remove('cm-line-highlighted');
        lastLineRef.current = null;
      }
      
      // Find the last meaningful line (directly from main branch)
      const lines = Array.from(document.querySelectorAll('.cm-line'));
      let lastLine = null;
      
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const content = line.textContent || '';
        if (content.trim() && !content.includes('END OF CODE')) {
          lastLine = line as HTMLElement;
          break;
        }
      }
      
      // Apply highlighting to last line
      if (lastLine) {
        lastLine.classList.add('cm-line-highlighted');
        lastLineRef.current = lastLine;
      }
    };
    
    // Set up MutationObserver for content changes (main branch approach)
    const setupContentObserver = () => {
      if (!scrollerRef.current) return;
      
      // Don't create multiple observers
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      
      // Create the observer (from main branch)
      const contentObserver = new MutationObserver(() => {
        if (!scrollerRef.current || !shouldScroll()) return;
        
        const newHeight = scrollerRef.current.scrollHeight;
        
        // Always highlight the last line when streaming
        if (shouldScroll()) {
          highlightLastLine();
        }
        
        // Skip if height hasn't changed
        if (newHeight === lastScrollHeight.current) return;
        
        // Calculate if we're near the bottom (from main branch)
        const isNearBottom = 
          scrollerRef.current.scrollTop + scrollerRef.current.clientHeight > 
          lastScrollHeight.current - 100;
        
        // Only scroll if user hasn't scrolled or is already near bottom
        if (!hasUserScrolled.current || isNearBottom) {
          scrollToBottom();
        }
        
        lastScrollHeight.current = newHeight;
      });
      
      // Handle manual scrolling (from main branch)
      const handleScroll = () => {
        if (isScrolling.current || !scrollerRef.current) return;
        
        const currentPosition = scrollerRef.current.scrollTop;
        if (Math.abs(currentPosition - lastScrollPosition.current) > 10) {
          hasUserScrolled.current = true;
          lastScrollPosition.current = currentPosition;
          
          // Reset when scrolled to bottom (allows auto-scrolling to resume)
          if (
            scrollerRef.current.scrollTop + scrollerRef.current.clientHeight >=
            scrollerRef.current.scrollHeight - 50
          ) {
            hasUserScrolled.current = false;
          }
        }
      };
      
      // Set up the observer and scroll handler
      if (scrollerRef.current) {
        contentObserver.observe(scrollerRef.current, {
          childList: true,
          subtree: true,
          characterData: true,
        });
        
        scrollerRef.current.addEventListener('scroll', handleScroll);
        
        // Initial highlight
        if (shouldScroll()) {
          highlightLastLine();
        }
      }
      
      // Store the observer for cleanup
      observerRef.current = contentObserver;
    };
    
    // Main branch's approach to finding the scroller with a fallback
    const findAndSetupScroller = () => {
      // Try various selectors to find the editor scroller
      const selectors = [
        '.cm-scroller', 
        '.sp-editor-container .cm-scroller',
        '.sp-layout .sp-editor .cm-scroller',
        '[data-testid="code-editor"] .cm-scroller'
      ];
      
      for (const selector of selectors) {
        const scroller = document.querySelector(selector);
        if (scroller instanceof HTMLElement) {
          scrollerRef.current = scroller;
          break;
        }
      }
      
      if (scrollerRef.current) {
        // We found the scroller, set up observers
        setupContentObserver();
        
        // Do an initial scroll to bottom
        scrollToBottom();
        
        // Clear the interval since we found the scroller
        if (checkForScrollerIntervalRef.current) {
          window.clearInterval(checkForScrollerIntervalRef.current);
          checkForScrollerIntervalRef.current = null;
        }
      }
    };
    
    // Actively check for scroller (main branch approach)
    checkForScrollerIntervalRef.current = window.setInterval(() => {
      if (scrollerRef.current) {
        window.clearInterval(checkForScrollerIntervalRef.current!);
        checkForScrollerIntervalRef.current = null;
        return;
      }
      
      findAndSetupScroller();
    }, 100);
    
    // Initial attempt to find and setup
    findAndSetupScroller();
    
    // Do a delayed scroll to ensure we catch late-mounting editors
    const initialScrollTimeoutId = window.setTimeout(() => {
      if (scrollerRef.current) {
        scrollToBottom();
        highlightLastLine();
      }
    }, 300);
    
    // Return cleanup function
    return () => {
      cleanup();
      window.clearTimeout(initialScrollTimeoutId);
    };
  }, [isStreaming, codeReady, activeView]);
  
  return null;
};

export default SandpackScrollController;
