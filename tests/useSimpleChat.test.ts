import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useSimpleChat } from '../app/hooks/useSimpleChat';
import { parseContent, parseDependencies } from '../app/utils/segmentParser';
import type { ChatMessage, AiChatMessage } from '../app/types/chat';

// Mock the prompts module
vi.mock('../app/prompts', () => ({
  makeBaseSystemPrompt: vi.fn().mockResolvedValue('Mocked system prompt')
}));

describe('segmentParser utilities', () => {
  it('correctly parses markdown content with no code blocks', () => {
    const text = 'This is a simple markdown text with no code blocks.';
    const result = parseContent(text);
    
    expect(result.segments.length).toBe(1);
    expect(result.segments[0].type).toBe('markdown');
    expect(result.segments[0].content).toBe(text);
    expect(result.dependenciesString).toBeUndefined();
  });
  
  it('correctly parses content with code blocks', () => {
    const text = `
Here's a React component:

\`\`\`jsx
function Button() {
  return <button>Click me</button>;
}
\`\`\`

You can use it in your app.
    `.trim();
    
    const result = parseContent(text);
    
    expect(result.segments.length).toBe(3);
    expect(result.segments[0].type).toBe('markdown');
    expect(result.segments[0].content).toContain("Here's a React component:");
    expect(result.segments[1].type).toBe('code');
    expect(result.segments[1].content).toContain("function Button()");
    expect(result.segments[2].type).toBe('markdown');
    expect(result.segments[2].content).toContain("You can use it in your app.");
  });
  
  it('correctly extracts dependencies from content', () => {
    const text = `{"react": "^18.2.0", "react-dom": "^18.2.0"}}

Here's how to use React.
    `.trim();
    
    const result = parseContent(text);
    
    expect(result.dependenciesString).toBe('{"react": "^18.2.0", "react-dom": "^18.2.0"}}');
    expect(result.segments.length).toBe(1);
    expect(result.segments[0].type).toBe('markdown');
    expect(result.segments[0].content.trim()).toBe("Here's how to use React.");
  });
  
  it('correctly parses dependencies string into object', () => {
    const dependenciesString = '{"react": "^18.2.0", "react-dom": "^18.2.0"}}';
    const dependencies = parseDependencies(dependenciesString);
    
    expect(dependencies).toEqual({
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    });
  });
  
  it('returns empty object for invalid dependencies string', () => {
    const dependencies = parseDependencies(undefined);
    expect(dependencies).toEqual({});
    
    const emptyDependencies = parseDependencies('{}');
    expect(emptyDependencies).toEqual({});
  });
});

describe('useSimpleChat', () => {
  beforeEach(() => {
    // Mock window.fetch
    vi.spyOn(window, 'fetch').mockImplementation(async () => {
      // Mock response with a readable stream
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('This is a test response'));
          controller.close();
        }
      });

      return {
        ok: true,
        body: stream,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      } as Response;
    });

    // Mock ScrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
    
    // Mock environment variables
    vi.stubEnv('VITE_OPENROUTER_API_KEY', 'test-api-key');
    
    // Mock import.meta.env.MODE for testing
    vi.stubGlobal('import', {
      meta: {
        env: {
          MODE: 'test',
          VITE_OPENROUTER_API_KEY: 'test-api-key'
        }
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('initializes with empty messages', () => {
    const { result } = renderHook(() => useSimpleChat());
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.input).toBe('');
  });

  it('updates input value', () => {
    const { result } = renderHook(() => useSimpleChat());
    
    act(() => {
      result.current.setInput('Hello, AI!');
    });
    
    expect(result.current.input).toBe('Hello, AI!');
  });

  it('sends a message and receives a response', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Simulate a streaming response
          const chunks = [
            'Hello',
            '! How can I help ',
            'you today?'
          ];
          
          // Add chunks to the stream with delays
          chunks.forEach(chunk => {
            controller.enqueue(encoder.encode(chunk));
          });
          
          controller.close();
        }
      });
      
      return {
        ok: true,
        body: stream,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      } as Response;
    });
    
    window.fetch = mockFetch;
    
    const { result } = renderHook(() => useSimpleChat());
    
    act(() => {
      result.current.setInput('Hello, AI!');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });
    
    // Should have 2 messages: user message and AI response
    expect(result.current.messages.length).toBe(2);
    
    // Check user message
    expect(result.current.messages[0].type).toBe('user');
    expect(result.current.messages[0].text).toBe('Hello, AI!');
    
    // Check AI message
    expect(result.current.messages[1].type).toBe('ai');
    expect(result.current.messages[1].text).toBe('Hello! How can I help you today?');
    expect((result.current.messages[1] as AiChatMessage).segments.length).toBe(1);
    expect((result.current.messages[1] as AiChatMessage).segments[0].type).toBe('markdown');
    expect((result.current.messages[1] as AiChatMessage).segments[0].content).toBe('Hello! How can I help you today?');
  });

  it('correctly parses markdown and code segments', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      const encoder = new TextEncoder();
      const markdownAndCodeResponse = `
Here's a simple React component:

\`\`\`jsx
function HelloWorld() {
  return <div>Hello, World!</div>;
}

export default HelloWorld;
\`\`\`

You can use this component in your application.
      `.trim();
      
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(markdownAndCodeResponse));
          controller.close();
        }
      });
      
      return {
        ok: true,
        body: stream,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      } as Response;
    });
    
    window.fetch = mockFetch;
    
    const { result } = renderHook(() => useSimpleChat());
    
    act(() => {
      result.current.setInput('Create a React component');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });
    
    // Check AI message segments
    const aiMessage = result.current.messages[1] as AiChatMessage;
    expect(aiMessage.segments.length).toBe(3);
    
    // First segment should be markdown intro
    expect(aiMessage.segments[0].type).toBe('markdown');
    expect(aiMessage.segments[0].content).toContain("Here's a simple React component:");
    
    // Second segment should be code
    expect(aiMessage.segments[1].type).toBe('code');
    expect(aiMessage.segments[1].content).toContain("function HelloWorld()");
    
    // Third segment should be markdown conclusion
    expect(aiMessage.segments[2].type).toBe('markdown');
    expect(aiMessage.segments[2].content).toContain("You can use this component");
    
    // getCurrentCode should return the code block
    expect(result.current.getCurrentCode()).toContain("function HelloWorld()");
  });

  it('extracts dependencies from response', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      const encoder = new TextEncoder();
      const responseWithDependencies = `
{"react": "^18.2.0", "react-dom": "^18.2.0"}}

Here's a React component that uses useEffect:

\`\`\`jsx
import React, { useEffect } from 'react';

function Timer() {
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('Tick');
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return <div>Timer Running</div>;
}

export default Timer;
\`\`\`
      `.trim();
      
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(responseWithDependencies));
          controller.close();
        }
      });
      
      return {
        ok: true,
        body: stream,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      } as Response;
    });
    
    window.fetch = mockFetch;
    
    const { result } = renderHook(() => useSimpleChat());
    
    act(() => {
      result.current.setInput('Create a timer component');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });
    
    // Check AI message has dependenciesString
    const aiMessage = result.current.messages[1] as AiChatMessage;
    expect(aiMessage.dependenciesString).toBe('{"react": "^18.2.0", "react-dom": "^18.2.0"}}');
  });
}); 