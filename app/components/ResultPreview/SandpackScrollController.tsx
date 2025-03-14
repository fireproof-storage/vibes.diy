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
  // Simple refs for tracking state
  const animationFrameRef = useRef<number | null>(null);
  const isHighlighting = useRef(false);
  const lastLineRef = useRef<HTMLElement | null>(null);
  const hasStartedScrolling = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 20; // Maximum number of retries to find the scroller
  const initTimeoutRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  
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
  
  // Simple check if we should be scrolling
  const shouldScroll = () => {
    return isStreaming && !codeReady && activeView === 'code';
  };
  
  // Function to find the editor scroller, trying multiple possible selectors
  const findEditorScroller = (): HTMLElement | null => {
    // Try various selectors for better resilience
    const selectors = [
      '.cm-scroller', 
      '.sp-editor-container .cm-scroller',
      '.sp-layout .sp-editor .cm-scroller',
      '[data-testid="code-editor"] .cm-scroller'
    ];
    
    let foundScroller: HTMLElement | null = null;
    
    for (const selector of selectors) {
      const scroller = document.querySelector(selector);
      if (scroller instanceof HTMLElement) {
        retryCount.current = 0; // Reset retry count when found
        foundScroller = scroller;
        break;
      }
    }
    
    // If we get here and didn't find any matching elements
    if (!foundScroller) {
      retryCount.current += 1;
    }
    
    return foundScroller;
  };
  
  // Function to find and get the last line
  const findLastLine = (): HTMLElement | null => {
    const lines = document.querySelectorAll('.cm-line');
    if (lines.length > 0) {
      return lines[lines.length - 1] as HTMLElement;
    }
    return null;
  };
  
  // More conservative scrolling approach that won't cause rapid state updates
  const scrollToBottom = (editorScroller: HTMLElement, lastLine: HTMLElement | null) => {
    // Avoid using scrollIntoView which can trigger intersection observers
    if (editorScroller) {
      // Only set scrollTop which is less likely to trigger observers
      editorScroller.scrollTop = editorScroller.scrollHeight;
    }
    
    // Apply highlighting to the last line if we have one
    if (lastLine && lastLine !== lastLineRef.current) {
      // Remove previous highlight
      if (lastLineRef.current) {
        lastLineRef.current.classList.remove('cm-line-highlighted');
      }
      
      // Add highlight to new line
      lastLine.classList.add('cm-line-highlighted');
      lastLineRef.current = lastLine;
    }
  };
  
  // Main function to scroll to bottom and highlight the last line
  const scrollAndHighlight = () => {
    // Only proceed if we should be scrolling
    if (!shouldScroll()) {
      cleanupScrolling();
      return;
    }
    
    // Try to find the editor scroller
    const editorScroller = findEditorScroller();
    const lastLine = findLastLine();
    
    if (editorScroller) {
      // Use a less aggressive approach with timeout instead of animation frame
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Scroll at a reasonable interval that won't overwhelm React
      scrollTimeoutRef.current = window.setTimeout(() => {
        scrollToBottom(editorScroller, lastLine);
        
        // Schedule next update if we should still be scrolling
        if (shouldScroll()) {
          scrollTimeoutRef.current = window.setTimeout(() => {
            scrollAndHighlight();
          }, 100); // Scroll every 100ms instead of every frame
        }
      }, 0);
    } else if (retryCount.current > maxRetries) {
      // If we've exceeded max retries, pause and try again after a delay
      console.warn('Could not find editor scroller after multiple attempts, will retry in 500ms');
      retryCount.current = 0; // Reset for next run
      
      // Retry with a delay to allow for components to fully mount
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = window.setTimeout(() => {
        if (shouldScroll()) {
          scrollAndHighlight();
        }
      }, 500);
    } else {
      // Try again soon if we didn't find it but haven't exceeded retries
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = window.setTimeout(() => {
        if (shouldScroll()) {
          scrollAndHighlight();
        }
      }, 100);
    }
  };
  
  // Clean up all timers and state
  const cleanupScrolling = () => {
    // Cancel animation frame if running
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Clear any timeouts
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    
    // Clear any highlighting
    if (lastLineRef.current) {
      lastLineRef.current.classList.remove('cm-line-highlighted');
      lastLineRef.current = null;
    }
    
    isHighlighting.current = false;
    hasStartedScrolling.current = false;
    retryCount.current = 0;
  };
  
  // Main useEffect for scrolling and highlighting in CODE view
  useEffect(() => {
    // Clean up any existing timers
    cleanupScrolling();
    
    if (initTimeoutRef.current) {
      window.clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
    
    // We start or stop scrolling based on condition changes
    if (shouldScroll()) {
      // Only start if we haven't already
      if (!hasStartedScrolling.current) {
        hasStartedScrolling.current = true;
        retryCount.current = 0;
        
        // Start with a small delay to allow CodeMirror to initialize
        initTimeoutRef.current = window.setTimeout(() => {
          scrollAndHighlight();
          initTimeoutRef.current = null;
        }, 300); // Longer delay to avoid interference with initialization
      }
    } else {
      // Make sure we clean up
      cleanupScrolling();
    }
    
    // Cleanup on unmount or when conditions change
    return cleanupScrolling;
  }, [isStreaming, codeReady, activeView]);
  
  return null;
};

export default SandpackScrollController;
