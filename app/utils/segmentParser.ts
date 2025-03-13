import type { Segment } from '../types/chat';

/**
 * Parse content into segments of markdown and code
 * This is a pure function that doesn't rely on any state
 */
export function parseContent(text: string): {
  segments: Segment[];
  dependenciesString: string | undefined;
} {
  const segments: Segment[] = [];
  let dependenciesString: string | undefined;

  // Extract dependencies from the first segment (if it exists)
  const depsMatch = text.match(/^(.*}})/s);
  if (depsMatch && depsMatch[1]) {
    dependenciesString = depsMatch[1];
    // Remove the dependencies part from the text
    text = text.slice(depsMatch[1].length);
  }

  // Find all code blocks using a regular expression
  // This regex matches code blocks with an optional language specifier
  const codeBlockPattern = /```(?:[a-zA-Z0-9]+)?([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;

  while ((match = codeBlockPattern.exec(text)) !== null) {
    const codeBlockStart = match.index;
    const codeBlockEnd = match.index + match[0].length;
    const codeContent = match[1].trim(); // This is the content between the backticks
    
    // Add markdown segment before the code block if there is any
    if (codeBlockStart > lastIndex) {
      const markdownContent = text.substring(lastIndex, codeBlockStart);
      if (markdownContent.trim()) {
        segments.push({
          type: 'markdown',
          content: markdownContent,
        });
      }
    }
    
    // Add the code segment
    if (codeContent) {
      segments.push({
        type: 'code',
        content: codeContent,
      });
    }
    
    lastIndex = codeBlockEnd;
  }
  
  // Add any remaining text as markdown
  if (lastIndex < text.length) {
    const markdownContent = text.substring(lastIndex);
    if (markdownContent.trim()) {
      segments.push({
        type: 'markdown',
        content: markdownContent,
      });
    }
  }

  // If no segments were created, treat the entire content as markdown
  if (segments.length === 0) {
    segments.push({
      type: 'markdown',
      content: text,
    });
  }

  return { segments, dependenciesString };
}

/**
 * Extract dependencies as a Record from the dependencies string
 */
export function parseDependencies(dependenciesString?: string): Record<string, string> {
  if (!dependenciesString) return {};

  const dependencies: Record<string, string> = {};
  const matches = dependenciesString.match(/"([^"]+)"\s*:\s*"([^"]+)"/g);

  if (matches) {
    matches.forEach((match) => {
      const keyMatch = match.match(/"([^"]+)"\s*:/);
      const valueMatch = match.match(/:\s*"([^"]+)"/);

      if (keyMatch?.[1] && valueMatch?.[1]) {
        const key = keyMatch[1].trim();
        const value = valueMatch[1].trim();

        if (key && value) {
          dependencies[key] = value;
        }
      }
    });
  }

  return dependencies;
}
