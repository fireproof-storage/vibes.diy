import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Segment } from '../types/chat';

interface StructuredMessageProps {
  segments: Segment[];
  isStreaming?: boolean;
}

/**
 * Component for displaying structured messages with markdown and code segments
 */
const StructuredMessage = memo(({ segments, isStreaming }: StructuredMessageProps) => {
  // Count number of lines in code segments
  const codeLines = segments
    .filter(segment => segment.type === 'code')
    .reduce((acc, segment) => acc + segment.content.split('\n').length, 0);

  return (
    <div className="structured-message">
      {segments.map((segment, index) => {
        if (segment.type === 'markdown') {
          return (
            <div key={`markdown-${index}`} className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{segment.content}</ReactMarkdown>
            </div>
          );
        } else if (segment.type === 'code') {
          // For code segments, show a summary with line count rather than full code
          return (
            <div key={`code-${index}`} className="my-4 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                  {`${codeLines} line${codeLines !== 1 ? 's' : ''} of code`}
                </span>
                
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(segment.content);
                  }}
                  className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Copy Code
                </button>
              </div>

              {/* Preview of first few lines */}
              <div className="overflow-hidden text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded max-h-24">
                {segment.content.split('\n').slice(0, 3).map((line, i) => (
                  <div key={i} className="truncate">
                    {line || ' '}
                  </div>
                ))}
                {segment.content.split('\n').length > 3 && (
                  <div className="text-gray-500 dark:text-gray-400">...</div>
                )}
              </div>
            </div>
          );
        }
        return null;
      })}
      
      {isStreaming && (
        <span className="bg-light-primary dark:bg-dark-primary ml-1 inline-block h-4 w-2 animate-pulse" />
      )}
    </div>
  );
});

StructuredMessage.displayName = 'StructuredMessage';

export default StructuredMessage; 