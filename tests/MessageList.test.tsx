import { vi, describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageList from '../app/components/MessageList';
import type { ChatMessage, Segment } from '../app/types/chat';

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('MessageList', () => {
  it('renders messages correctly', () => {
    const messages: ChatMessage[] = [
      { type: 'user', text: 'Hello' },
      { 
        type: 'ai', 
        text: 'Hi there!',
        segments: [{ type: 'markdown', content: 'Hi there!' }] 
      },
    ];

    render(<MessageList 
      messages={messages} 
      isGenerating={false} 
    />);

    expect(screen.getByText('Hello')).toBeDefined();
    expect(screen.getByText('Hi there!')).toBeDefined();
  });

  it('renders streaming message correctly', () => {
    const messages: ChatMessage[] = [
      { 
        type: 'ai', 
        text: 'Thinking...',
        segments: [{ type: 'markdown', content: 'Thinking...' }],
        isStreaming: true
      }
    ];

    render(<MessageList 
      messages={messages} 
      isGenerating={true} 
    />);

    expect(screen.getByText('Thinking...')).toBeDefined();
  });
});
