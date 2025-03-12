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

  // Log the complete content once for debugging purposes
  console.debug('=== BEGINNING OF CONTENT ===');
  console.debug(text);
  console.debug('=== END OF CONTENT ===');

  // Extract dependencies from the first segment (if it exists)
  const depsMatch = text.match(/^(.*}})/s);
  if (depsMatch && depsMatch[1]) {
    dependenciesString = depsMatch[1];
    // Remove the dependencies part from the text
    text = text.slice(depsMatch[1].length);
  }

  // More robust code block detection - matching standard markdown code fence pattern
  // This will match ```language\n and ``` patterns
  const codeBlockRegex = /```(?:([a-zA-Z0-9]+)?\n)?/g;

  let match;
  let lastIndex = 0;
  let inCodeBlock = false;

  // Loop through all code block markers
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchLength = match[0].length;

    if (!inCodeBlock) {
      // This is the start of a code block
      // Add the text before this code block as markdown
      const markdownContent = text.substring(lastIndex, matchIndex);
      if (markdownContent.trim()) {
        segments.push({
          type: 'markdown',
          content: markdownContent,
        });
      }

      // Mark the position after this code block marker
      lastIndex = matchIndex + matchLength;
      inCodeBlock = true;
    } else {
      // This is the end of a code block
      // Add the code block content
      const codeContent = text.substring(lastIndex, matchIndex);
      if (codeContent) {
        segments.push({
          type: 'code',
          content: codeContent,
        });
      }

      // Mark the position after this code block marker
      lastIndex = matchIndex + matchLength;
      inCodeBlock = false;
    }
  }

  // Add any remaining content
  if (lastIndex < text.length) {
    segments.push({
      type: inCodeBlock ? 'code' : 'markdown',
      content: text.substring(lastIndex),
    });
  }

  // If no segments were created (which shouldn't happen but just in case)
  // treat the entire content as markdown
  if (segments.length === 0) {
    segments.push({
      type: 'markdown',
      content: text,
    });
  }

  // Log the resulting segments for debugging
  console.debug('Parsed segments:', segments.length);
  segments.forEach((segment, i) => {
    console.debug(`Segment ${i} (${segment.type}):`);
    console.debug(segment.content);
  });

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
