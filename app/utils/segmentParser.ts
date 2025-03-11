import type { Segment } from '../types/chat';

/**
 * Parse content into segments of markdown and code
 * This is a pure function that doesn't rely on any state
 */
export function parseContent(text: string): { segments: Segment[], dependenciesString: string | undefined } {
  const segments: Segment[] = [];
  let dependenciesString: string | undefined;

  // Extract dependencies from the first segment (if it exists)
  const depsMatch = text.match(/^(.*}})/s);
  if (depsMatch && depsMatch[1]) {
    dependenciesString = depsMatch[1];
    // Remove the dependencies part from the text
    text = text.slice(depsMatch[1].length);
  }

  // Split by code blocks (```...)
  const parts = text.split(/```(?:[^\n]*\n)?/);
  
  if (parts.length === 1) {
    // No code blocks found, just markdown
    segments.push({
      type: 'markdown',
      content: parts[0]
    });
  } else {
    // We have code blocks
    parts.forEach((part, index) => {
      if (index % 2 === 0) {
        // Even indices are markdown
        if (part.trim()) {
          segments.push({
            type: 'markdown',
            content: part
          });
        }
      } else {
        // Odd indices are code
        segments.push({
          type: 'code',
          content: part
        });
      }
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