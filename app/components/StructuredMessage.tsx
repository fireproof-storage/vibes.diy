import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Segment } from '../types/chat';

interface StructuredMessageProps {
  segments: Segment[];
  isStreaming?: boolean;
  messageId?: string;
  setSelectedResponseId?: (id: string) => void;
  selectedResponseId?: string;
}

/**
 * Component for displaying structured messages with markdown and code segments
 */
const StructuredMessage = memo(
  ({ segments, isStreaming, messageId, setSelectedResponseId, selectedResponseId }: StructuredMessageProps) => {
    // Ensure segments is an array (defensive)
    const validSegments = Array.isArray(segments) ? segments : [];

    // Calculate local codeReady state based on segments.length > 2 or !isStreaming
    const codeReady = validSegments.length > 2 || isStreaming === false;
    
    // Check if this message is currently selected
    // Special case: if we're streaming and there's no messageId or selectedResponseId, consider it selected
    const isSelected = 
      (messageId === selectedResponseId) || 
      (isStreaming && (!messageId && !selectedResponseId));

      // Count number of lines in code segments
    const codeLines = validSegments
      .filter((segment) => segment.type === 'code')
      .reduce((acc, segment) => acc + (segment.content?.split('\n').length || 0), 0);

    // CRITICAL: We always want to show something if there's any content at all
    const hasContent =
      validSegments.length > 0 &&
      validSegments.some((segment) => segment?.content && segment.content.trim().length > 0);

    // Handle click on code segments to select the response
    const handleCodeClick = () => {
      if (setSelectedResponseId && messageId) {
        setSelectedResponseId(messageId);
      }
    };

    return (
      <div className="structured-message">
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
                // For code segments, show a summary with line count rather than full code
                const content = segment.content || '';
                return (
                  <div
                    key={`code-${index}`}
                    className="my-4 cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 relative transition-colors"
                    onClick={handleCodeClick}
                  >
                    <div className={`absolute -top-1 left-1 text-lg ${
                      !codeReady 
                        ? 'text-orange-500 dark:text-orange-400' 
                        : isSelected
                          ? 'text-green-500 dark:text-green-400'
                          : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      •
                    </div>
                    <div className="mb-2 flex items-center justify-between rounded p-2">
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                        {`${codeLines} line${codeLines !== 1 ? 's' : ''}`}
                      </span>
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation(); // Prevent triggering the parent's onClick
                          navigator.clipboard.writeText(content);
                        }}
                        className="rounded bg-gray-200 px-2 py-1 text-sm transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 active:bg-orange-400 dark:active:bg-orange-600 active:text-orange-800 dark:active:text-orange-200"
                      >
                        <code className="font-mono ">
                          <span className="mr-3">App.jsx</span>
                        
                        <svg 
                          aria-hidden="true" 
                          height="16" 
                          viewBox="0 0 16 16" 
                          version="1.1" 
                          width="16" 
                          className="inline-block"
                        >
                          <path fill="currentColor" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
                          <path fill="currentColor" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
                        </svg>
                        </code>
                      </button>
                    </div>

                    {/* Preview of first few lines */}
                    <div className="max-h-24 overflow-hidden rounded p-2 font-mono text-sm shadow-inner bg-gray-100 dark:bg-gray-800">
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
  },
  (prevProps, nextProps) => {
    // Return false (force re-render) if selectedResponseId changes
    if (prevProps.selectedResponseId !== nextProps.selectedResponseId) {
      return false;
    }
    
    // Return false if messageId changes
    if (prevProps.messageId !== nextProps.messageId) {
      return false;
    }
    
    // Return false if streaming state changes
    if (prevProps.isStreaming !== nextProps.isStreaming) {
      return false;
    }
    
    // For segments, do a shallow comparison of length and content
    if (prevProps.segments.length !== nextProps.segments.length) {
      return false;
    }

    // Compare segments content by checking each segment
    for (let i = 0; i < prevProps.segments.length; i++) {
      const prevSegment = prevProps.segments[i];
      const nextSegment = nextProps.segments[i];
      
      if (prevSegment.type !== nextSegment.type || 
          prevSegment.content !== nextSegment.content) {
        return false;
      }
    }

    
    // Default to true (skip re-render) if nothing important changed
    return true;
  }
);

export default StructuredMessage;
