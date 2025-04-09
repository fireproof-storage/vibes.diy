import type { Segment } from '../types/chat';
import { CALLAI_API_KEY } from '../config/env';
import { callAI, type Message } from 'call-ai';

/**
 * Generate a title based on the first two segments (markdown and code)
 * Returns a promise that resolves when the title generation is complete
 *
 * @param segments - Array of content segments to analyze
 * @param model - The AI model to use for title generation
 * @returns A promise that resolves to the generated title or null if generation failed
 */
export async function generateTitle(segments: Segment[], model: string): Promise<string> {
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

  // Format messages for callAI
  const messages: Message[] = [
    {
      role: 'system',
      content:
        'You are a helpful assistant that generates short, descriptive titles. Create a concise title (3-5 words) that captures the essence of the content. Return only the title, no other text or markup. Don\'t say "Fireproof" or "app".',
    },
    {
      role: 'user',
      content: `Generate a short, descriptive title (3-5 words) for this app, use the React JSX <h1> tag's value if you can find it:\n\n${titleContent}`,
    },
  ];

  // Configure callAI options
  const options = {
    apiKey: CALLAI_API_KEY,
    model: model,
    headers: {
      'HTTP-Referer': 'https://vibes.diy',
      'X-Title': 'Vibes DIY',
    },
  };

  try {
    // Use callAI to get the title
    const title = (await callAI(messages, options)) as string;
    return title.trim() || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
}
