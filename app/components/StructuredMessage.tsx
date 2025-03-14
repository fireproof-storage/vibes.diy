import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Segment } from '../types/chat';

interface StructuredMessageProps {
  segments: Segment[];
  isStreaming?: boolean;
  messageId?: string;
  setSelectedResponseId?: (id: string) => void;
}

/**
 * Component for displaying structured messages with markdown and code segments
 */
const StructuredMessage = memo(
  ({ segments, isStreaming, messageId, setSelectedResponseId }: StructuredMessageProps) => {
    // Ensure segments is an array (defensive)
    const validSegments = Array.isArray(segments) ? segments : [];

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
        console.log('handleCodeClick', messageId);
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
                    className="my-4 cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                    onClick={handleCodeClick}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                        {`${codeLines} line${codeLines !== 1 ? 's' : ''} of code`}
                      </span>

                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation(); // Prevent triggering the parent's onClick
                          navigator.clipboard.writeText(content);
                        }}
                        className="rounded bg-gray-200 px-2 py-1 text-xs transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                      >
                        <code className="mr-3 font-mono text-gray-400 dark:text-gray-600">
                          App.jsx
                        </code>
                        Copy
                      </button>
                    </div>

                    {/* Preview of first few lines */}
                    <div className="max-h-24 overflow-hidden rounded bg-gray-200 p-2 font-mono text-sm shadow-inner dark:bg-gray-900">
                      {content
                        .split('\n')
                        .slice(0, 3)
                        .map((line, i) => (
                          <div key={i} className="truncate">
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
  }
);

export default StructuredMessage;
