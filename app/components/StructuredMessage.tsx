import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Segment } from '../types/chat';

interface StructuredMessageProps {
  segments: Segment[];
  isStreaming?: boolean;
  messageId?: string;
  setSelectedResponseId: (id: string) => void;
  selectedResponseId: string;
  setMobilePreviewShown: (shown: boolean) => void;
  rawText?: string; // Raw message text to be copied on shift+click
  setActiveView?: (view: 'preview' | 'code' | 'data') => void; // Add ability to set active view
}

// Extracted CodeSegment as a separate component to avoid hooks in render functions
interface CodeSegmentProps {
  segment: Segment;
  index: number;
  codeReady: boolean;
  isSelected: boolean;
  messageId?: string;
  setSelectedResponseId: (id: string) => void;
  setMobilePreviewShown: (shown: boolean) => void;
  codeLines: number;
  rawText?: string; // Raw message text to be copied on shift+click
  isStreaming?: boolean; // Add isStreaming to determine how to handle navigation
  setActiveView?: (view: 'preview' | 'code' | 'data') => void; // Add ability to set active view
}

const CodeSegment = ({
  segment,
  index,
  codeReady,
  isSelected,
  messageId,
  setSelectedResponseId,
  setMobilePreviewShown,
  codeLines,
  rawText,
  isStreaming,
  setActiveView,
}: CodeSegmentProps) => {
  const content = segment.content || '';
  const codeSegmentRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(true);

  // Utility function to check if parents are scrollable
  useEffect(() => {
    if (!codeSegmentRef.current) return;

    // Check if any parent is scrollable
    let el = codeSegmentRef.current.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      const overflow = style.getPropertyValue('overflow');
      const overflowY = style.getPropertyValue('overflow-y');

      if (
        overflow === 'auto' ||
        overflow === 'scroll' ||
        overflowY === 'auto' ||
        overflowY === 'scroll'
      ) {
        // Parent is scrollable
      }

      el = el.parentElement;
    }
  }, []);

  // Set up intersection observer to detect when element becomes sticky
  useEffect(() => {
    if (!codeSegmentRef.current) return;

    // Create a sentinel element that will be placed above the sticky element
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.width = '100%';
    sentinel.style.position = 'absolute';
    // Position the sentinel element at an extremely far distance for testing
    sentinel.style.top = '200px';
    sentinel.style.left = '0';
    sentinel.style.zIndex = '1000'; // Ensure it's on top

    if (codeSegmentRef.current.parentElement) {
      codeSegmentRef.current.parentElement.insertBefore(sentinel, codeSegmentRef.current);
    }

    // Check if IntersectionObserver is available (for tests and older browsers)
    if (typeof IntersectionObserver === 'undefined') {
      // Simple fallback for test environment
      const handleScroll = () => {
        if (codeSegmentRef.current) {
          const rect = codeSegmentRef.current.getBoundingClientRect();
          // Extremely large threshold for dramatic testing
          setIsSticky(rect.top <= 200); // 200px threshold for testing
        }
      };

      window.addEventListener('scroll', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll);
        sentinel.remove();
      };
    }

    // Create observer for the sentinel
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is not intersecting, the element is sticky
        const isNowSticky = !entry.isIntersecting;
        setIsSticky(isNowSticky);
      },
      {
        threshold: 0,
        rootMargin: '0px 0px -200px 0px', // Extremely large margin for dramatic testing
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  // Handle click on code segments to select the response
  const handleCodeClick = () => {
    if (messageId) {
      setSelectedResponseId(messageId);
    }

    // Always show mobile preview and set to code view regardless of selection state
    // This ensures we can always enter code view by clicking a code segment
    setMobilePreviewShown(true);

    // Always navigate to code view when clicking on a code segment
    if (setActiveView) {
      setActiveView('code');
    }
  };

  return (
    <div
      ref={codeSegmentRef}
      data-code-segment={index}
      style={{
        position: 'sticky',
        top: '8px',
        zIndex: 10,
      }}
      className={`relative my-4 cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm transition-all hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 ${
        isSticky ? 'sticky-active' : ''
      }`}
      onClick={handleCodeClick}
    >
      <div
        className={`absolute -top-1 left-1 text-lg ${
          !codeReady
            ? 'text-orange-500 dark:text-orange-400'
            : isSelected
              ? 'text-green-500 dark:text-green-400'
              : 'text-gray-400 dark:text-gray-600'
        }`}
      >
        •
      </div>
      <div className="flex items-center justify-between rounded p-2">
        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
          {`${codeLines} line${codeLines !== 1 ? 's' : ''}`}
        </span>
        <button
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent triggering the parent's onClick
            // If shift key is pressed, copy the raw message text instead of just the code
            const textToCopy = e.shiftKey && rawText ? rawText : content;
            navigator.clipboard.writeText(textToCopy);
          }}
          className="rounded bg-gray-200 px-2 py-1 text-sm text-gray-500 transition-colors hover:bg-gray-300 hover:text-gray-600 active:bg-orange-400 active:text-orange-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 dark:active:bg-orange-600 dark:active:text-orange-200"
        >
          <code className="font-mono">
            <span className="mr-3">App.jsx</span>

            <svg
              aria-hidden="true"
              height="16"
              viewBox="0 0 16 16"
              version="1.1"
              width="16"
              className="inline-block"
            >
              <path
                fill="currentColor"
                d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"
              ></path>
              <path
                fill="currentColor"
                d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"
              ></path>
            </svg>
          </code>
        </button>
      </div>

      {/* Code preview with height transition instead of conditional rendering */}
      <div
        className={`overflow-hidden rounded bg-gray-100 font-mono text-sm shadow-inner transition-all dark:bg-gray-800 ${
          isSticky ? 'm-0 h-0 max-h-0 min-h-0 border-0 p-0 opacity-0' : 'mt-2 max-h-24 p-2'
        }`}
      >
        {content
          .split('\n')
          .slice(0, 3)
          .map((line, i) => (
            <div key={i} className="truncate text-gray-800 dark:text-gray-300">
              {line || ' '}
            </div>
          ))}
        {content.split('\n').length > 3 && (
          <div className="text-gray-500 dark:text-gray-400">...</div>
        )}
      </div>
    </div>
  );
};

/**
 * Component for displaying structured messages with markdown and code segments
 */
const StructuredMessage = ({
  segments,
  isStreaming,
  messageId,
  setSelectedResponseId,
  selectedResponseId,
  setMobilePreviewShown,
  rawText,
  setActiveView,
}: StructuredMessageProps) => {
  // Ensure segments is an array (defensive)
  const validSegments = Array.isArray(segments) ? segments : [];

  // Calculate local codeReady state based on segments.length > 2 or !isStreaming
  const codeReady = validSegments.length > 2 || isStreaming === false;

  // Check if this message is currently selected by direct ID comparison
  const isSelected = messageId === selectedResponseId;

  // Count number of lines in code segments
  const codeLines = validSegments
    .filter((segment) => segment.type === 'code')
    .reduce((acc, segment) => acc + (segment.content?.split('\n').length || 0), 0);

  // CRITICAL: We always want to show something if there's any content at all
  const hasContent =
    validSegments.length > 0 &&
    validSegments.some((segment) => segment?.content && segment.content.trim().length > 0);

  // Add CSS for sticky elements
  useEffect(() => {
    // Add CSS rules for sticky elements if they don't exist yet
    if (!document.getElementById('sticky-segment-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'sticky-segment-styles';
      styleEl.textContent = `
          .sticky-active {
            padding: 8px !important;
            transition: all 0.8s ease-in-out;
          }
          
          [data-code-segment] {
            transition: all 0.8s ease-in-out;
          }
          
          [data-code-segment] > div {
            transition: all 0.8s ease-in-out;
          }
        `;
      document.head.appendChild(styleEl);
    }

    return () => {
      // Clean up the style element when component unmounts
      const styleEl = document.getElementById('sticky-segment-styles');
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, []);

  return (
    <div className="structured-message" style={{ overflow: 'visible', position: 'relative' }}>
      {!hasContent ? (
        // Show placeholder if there are no segments with content
        <div className="prose prose-sm dark:prose-invert prose-ul:pl-5 prose-ul:list-disc prose-ol:pl-5 prose-ol:list-decimal prose-li:my-0 max-w-none">
          <p>Processing response...</p>
        </div>
      ) : (
        // Map and render each segment that has content
        validSegments
          .filter((segment): segment is Segment =>
            Boolean(segment?.content && segment.content.trim().length > 0)
          )
          .map((segment, index) => {
            if (segment.type === 'markdown') {
              return (
                <div key={`markdown-${index}`} className="ai-markdown prose">
                  <ReactMarkdown>{segment.content || ''}</ReactMarkdown>
                </div>
              );
            } else if (segment.type === 'code') {
              return (
                <CodeSegment
                  key={`code-${index}`}
                  segment={segment}
                  index={index}
                  codeReady={codeReady}
                  isSelected={isSelected}
                  messageId={messageId}
                  setSelectedResponseId={setSelectedResponseId}
                  setMobilePreviewShown={setMobilePreviewShown}
                  codeLines={codeLines}
                  rawText={rawText}
                  isStreaming={isStreaming}
                  setActiveView={setActiveView}
                />
              );
            }
            return null;
          })
      )}

      {/* Show streaming indicator only when streaming AND we already have content */}
      {isStreaming && hasContent && (
        <span className="bg-light-primary dark:bg-dark-primary ml-1 inline-block h-4 w-2 animate-pulse" />
      )}
    </div>
  );
};

export default StructuredMessage;
