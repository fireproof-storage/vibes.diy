import React, { useState } from 'react';
import type { ChatMessage } from '../types/chat';

// Helper function to parse raw content into segments if segments aren't available
function parseRawContent(rawContent: string) {
  if (!rawContent) return [];
  
  // First clean up common JSON artifacts from the raw content
  let cleanedContent = rawContent;
  
  // Clean up dependencies JSON at the beginning
  cleanedContent = cleanedContent.replace(/^\s*\{"dependencies":\s*\{.*?\}\}\s*/i, '');
  
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  // Find all code blocks
  while ((match = codeBlockRegex.exec(cleanedContent)) !== null) {
    // If there's content before this code block, add it as pre-code
    if (match.index > lastIndex) {
      segments.push({
        type: 'pre-code',
        content: cleanedContent.slice(lastIndex, match.index).trim()
      });
    }

    // Add the code block
    segments.push({
      type: 'code',
      content: match[1].trim()
    });

    lastIndex = match.index + match[0].length;
  }

  // If there's content after the last code block, add it as post-code
  if (lastIndex < cleanedContent.length) {
    // Clean up any trailing code closure syntax that might have leaked
    let postCodeContent = cleanedContent.slice(lastIndex).trim();
    
    // Remove common code closure patterns that might have leaked
    postCodeContent = postCodeContent.replace(/^[\s\n]*\);?\s*\}[\s\n]*```[\s\n]*/i, '');
    
    segments.push({
      type: 'post-code',
      content: postCodeContent
    });
  }

  return segments;
}

export interface StructuredMessageProps {
  message: ChatMessage;
}

export default function StructuredMessage({ message }: StructuredMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Handle null or undefined messages gracefully
  if (!message) {
    return null;
  }
  
  // Use segments if available, otherwise parse from rawContent
  const segments = message.segments || 
    (message.rawContent ? parseRawContent(message.rawContent) : []);
  
  // If we have no segments, fall back to original display
  if (!segments || segments.length === 0) {
    return (
      <div className="message">
        <div className="message-text">{message.text}</div>
        {message.code && (
          <div className="message-code">
            <pre className="bg-gray-50 p-4 rounded overflow-auto">
              <code>{message.code}</code>
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Extract segments by type - all are optional
  const preCodeSegment = segments.find(s => s.type === 'pre-code');
  const codeSegment = segments.find(s => s.type === 'code');
  const postCodeSegment = segments.find(s => s.type === 'post-code');
  
  // Extract content and clean it further (or use empty string if segment doesn't exist)
  let preCode = preCodeSegment?.content || '';
  // Additional cleanup for pre-code text to remove JSON artifacts
  preCode = preCode.replace(/^\s*\{"dependencies":\s*\{.*?\}\}\s*/i, '');
  preCode = preCode.replace(/^\s*:""[}\s]*/i, '');
  preCode = preCode.replace(/^\s*""\s*:\s*""[}\s]*/i, '');
  
  const code = message.code || codeSegment?.content || '';
  
  let postCode = postCodeSegment?.content || '';
  // Additional cleanup for post-code text to remove stray code syntax
  postCode = postCode.replace(/^[\s\n]*\);?\s*\}[\s\n]*```[\s\n]*/i, '');
  postCode = postCode.replace(/^[\s\n]*\);[\s\n]*/i, '');
  
  // Only render if we have content
  const hasPreCode = !!preCode.trim();
  const hasCode = !!code.trim();
  const hasPostCode = !!postCode.trim();
  
  // Line count only if we have code
  const codeLineCount = hasCode ? code.split('\n').length : 0;
  
  return (
    <div className="structured-message">
      {/* Pre-code section - optional */}
      {hasPreCode && (
        <div className="pre-code-section">
          {preCode}
        </div>
      )}
      
      {/* Code section - optional */}
      {hasCode && (
        <div className="code-section border rounded-lg my-4 overflow-hidden">
          <div className="code-header bg-gray-100 p-3 flex justify-between items-center">
            <div className="code-info">
              <span className="code-icon mr-2">💻</span>
              <span className="code-stats font-medium">{codeLineCount} lines of code</span>
            </div>
            <button 
              className="expand-button px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 text-sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          
          {isExpanded && (
            <div className="code-content">
              <pre className="bg-gray-50 p-4 m-0 overflow-auto">
                <code>{code}</code>
              </pre>
            </div>
          )}
        </div>
      )}
      
      {/* Post-code section - only shown if we have both code and post-code content */}
      {hasCode && hasPostCode && (
        <div className="post-code-section">
          {postCode}
        </div>
      )}
    </div>
  );
} 