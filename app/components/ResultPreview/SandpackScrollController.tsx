import { useEffect, useRef } from 'react';

interface SandpackScrollControllerProps {
  isStreaming: boolean;
}

const SandpackScrollController: React.FC<SandpackScrollControllerProps> = ({ isStreaming }) => {
  const lastScrollHeight = useRef(0);
  const lastScrollPosition = useRef(0);
  const isScrolling = useRef(false);
  const hasUserScrolled = useRef(false);
  const highlightIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let primaryScroller: HTMLElement | null = null;

    if (!document.getElementById('highlight-style')) {
      const style = document.createElement('style');
      style.id = 'highlight-style';
      style.textContent = `
        .cm-line-highlighted {
          position: relative !important;
          border-left: 3px solid rgba(0, 137, 249, 0.27) !important;
          color: inherit !important;
        }
        
        .cm-line-highlighted::before {
          content: "" !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: linear-gradient(60deg, rgba(0, 128, 255, 0.15), rgba(224, 255, 255, 0.25), rgba(0, 183, 255, 0.15)) !important;
          background-size: 200% 200% !important;
          animation: sparkleAppear 2s ease-out !important;
          pointer-events: none !important;
          z-index: -1 !important;
        }
        
        @keyframes sparkleGradient {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        
        @keyframes sparkleAppear {
          0% { opacity: 0.8; }
          50% { opacity: 0.8; }
          100% { opacity: 0.1; }
        }
      `;
      document.head.appendChild(style);
    }

    const scrollToBottom = () => {
      if (!primaryScroller) return;
      isScrolling.current = true;

      requestAnimationFrame(() => {
        if (primaryScroller) {
          primaryScroller.scrollTop = primaryScroller.scrollHeight;
          lastScrollHeight.current = primaryScroller.scrollHeight;
          lastScrollPosition.current = primaryScroller.scrollTop;
        }
        isScrolling.current = false;
      });
    };

    const highlightLastLine = () => {
      if (!primaryScroller || !isStreaming) return;

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
      }
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

      const contentObserver = new MutationObserver(() => {
        if (!primaryScroller) return;

        const newHeight = primaryScroller.scrollHeight;

        if (isStreaming) {
          highlightLastLine();
        } else {
          document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
            el.classList.remove('cm-line-highlighted');
          });
        }

        if (newHeight === lastScrollHeight.current) return;

        const isNearBottom =
          primaryScroller.scrollTop + primaryScroller.clientHeight > lastScrollHeight.current - 100;

        if (!hasUserScrolled.current || isNearBottom) {
          scrollToBottom();
        }

        lastScrollHeight.current = newHeight;
      });

      const handleScroll = () => {
        if (isScrolling.current || !primaryScroller) return;

        const currentPosition = primaryScroller.scrollTop;
        if (Math.abs(currentPosition - lastScrollPosition.current) > 10) {
          hasUserScrolled.current = true;
          lastScrollPosition.current = currentPosition;

          if (
            primaryScroller.scrollTop + primaryScroller.clientHeight >=
            primaryScroller.scrollHeight - 50
          ) {
            hasUserScrolled.current = false;
          }
        }
      };

      if (primaryScroller) {
        contentObserver.observe(primaryScroller, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        primaryScroller.addEventListener('scroll', handleScroll);

        if (isStreaming) {
          highlightLastLine();
        }
      }

      if (isStreaming) {
        highlightIntervalRef.current = setInterval(highlightLastLine, 10);
      }

      return () => {
        clearInterval(checkForScroller);
        if (highlightIntervalRef.current) {
          clearInterval(highlightIntervalRef.current);
          highlightIntervalRef.current = null;
        }
        contentObserver.disconnect();
        primaryScroller?.removeEventListener('scroll', handleScroll);
      };
    };

    setTimeout(scrollToBottom, 100);

    return () => {
      clearInterval(checkForScroller);
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
        highlightIntervalRef.current = null;
      }
    };
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming && highlightIntervalRef.current) {
      clearInterval(highlightIntervalRef.current);
      highlightIntervalRef.current = null;

      document.querySelectorAll('.cm-line-highlighted').forEach((el) => {
        el.classList.remove('cm-line-highlighted');
      });
    }
  }, [isStreaming]);

  return null;
};

export default SandpackScrollController;
