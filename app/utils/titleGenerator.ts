import type { Segment } from '../types/chat';

/**
 * Generate a title based on the first two segments (markdown and code)
 * Returns a promise that resolves when the title generation is complete
 * 
 * @param segments - Array of content segments to analyze
 * @param model - The AI model to use for title generation
 * @param updateTitle - Function to call to update the title in the session
 * @returns A promise that resolves to the generated title or null if generation failed
 */
export async function generateTitle(
  segments: Segment[],
  model: string,
  updateTitle: (title: string) => Promise<void>
): Promise<string | null> {
  try {
    // Get first markdown segment and first code segment (if they exist)
    const firstMarkdown = segments.find((seg) => seg.type === 'markdown');
    const firstCode = segments.find((seg) => seg.type === 'code');

    // Create content from the first two segments
    let titleContent = '';

    if (firstMarkdown) {
      titleContent += firstMarkdown.content + '\n\n';
    }

    if (firstCode) {
      titleContent += '```\n' + firstCode.content.split('\n').slice(0, 15).join('\n') + '\n```';
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Fireproof App Builder',
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that generates short, descriptive titles. Create a concise title (3-5 words) that captures the essence of the content. Return only the title, no other text or markup.',
          },
          {
            role: 'user',
            content: `Generate a short, descriptive title (3-5 words) for this app, use the React JSX <h1> tag's value if you can find it:\n\n${titleContent}`,
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const newTitle = data.choices[0]?.message?.content?.trim() || 'New Chat';
      await updateTitle(newTitle);
      return newTitle;
    }
  } catch (error) {
    console.error('Error generating title:', error);
  }

  return null;
} 