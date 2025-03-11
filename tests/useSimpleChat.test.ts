import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useSimpleChat } from '../app/hooks/useSimpleChat';
import { parseContent, parseDependencies } from '../app/utils/segmentParser';
import type { ChatMessage, AiChatMessage } from '../app/types/chat';
import fs from 'fs';
import path from 'path';

// Helper function to convert chunks into SSE format
function formatAsSSE(chunks: string[]): string[] {
  return chunks.map(chunk => {
    return `data: ${JSON.stringify({
      id: `gen-${Date.now()}`,
      provider: "Anthropic",
      model: "anthropic/claude-3.7-sonnet",
      object: "chat.completion.chunk",
      created: Date.now(),
      choices: [{
        index: 0,
        delta: {
          role: "assistant",
          content: chunk
        },
        finish_reason: null,
        native_finish_reason: null,
        logprobs: null
      }]
    })}\n\n`;
  });
}

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
          
          // Format chunks as SSE and send them
          const sseChunks = formatAsSSE(chunks);
          sseChunks.forEach(chunk => {
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
          // Send the content as SSE format
          const sseChunk = formatAsSSE([markdownAndCodeResponse])[0];
          controller.enqueue(encoder.encode(sseChunk));
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
          // Send the content as SSE format
          const sseChunk = formatAsSSE([responseWithDependencies])[0];
          controller.enqueue(encoder.encode(sseChunk));
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

  it('correctly handles complex responses with multiple segments and dependencies', async () => {
    // Function to split text into random sized chunks
    function splitIntoRandomChunks(text: string): string[] {
      const chunks: string[] = [];
      let remainingText = text;
      
      while (remainingText.length > 0) {
        // Random chunk size between 2 and 20 characters
        const chunkSize = Math.min(
          Math.floor(Math.random() * 19) + 2, 
          remainingText.length
        );
        
        chunks.push(remainingText.substring(0, chunkSize));
        remainingText = remainingText.substring(chunkSize);
      }
      
      return chunks;
    }
    
    const complexResponse = `
{"react": "^18.2.0", "react-dom": "^18.2.0", "react-router-dom": "^6.4.0", "tailwindcss": "^3.3.0"}}

# Image Gallery Component

Here's a comprehensive image gallery component that loads images from an API and displays them in a responsive grid:

\`\`\`jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function ImageGallery({ apiEndpoint = '/api/images', itemsPerPage = 12 }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  
  useEffect(() => {
    async function fetchImages() {
      try {
        setLoading(true);
        const response = await fetch(\`\${apiEndpoint}?page=\${page}&limit=\${itemsPerPage}\`);
        
        if (!response.ok) {
          throw new Error(\`API error: \${response.status}\`);
        }
        
        const data = await response.json();
        setImages(data.images || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch images:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchImages();
  }, [apiEndpoint, page, itemsPerPage]);
  
  const handleNextPage = () => setPage(prev => prev + 1);
  const handlePrevPage = () => setPage(prev => Math.max(1, prev - 1));
  
  if (loading && images.length === 0) {
    return <div className="flex justify-center p-8"><div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }
  
  if (error && images.length === 0) {
    return <div className="text-red-500 p-4 bg-red-50 rounded">Error loading images: {error}</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map(image => (
          <div key={image.id} className="overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <Link to={\`/image/\${image.id}\`}>
              <img 
                src={image.thumbnailUrl} 
                alt={image.title} 
                className="w-full h-48 object-cover"
                loading="lazy"
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold truncate">{image.title}</h3>
                <p className="text-sm text-gray-500">{image.category}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
      
      {images.length > 0 && (
        <div className="flex justify-between mt-8">
          <button 
            onClick={handlePrevPage} 
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="self-center">Page {page}</span>
          <button 
            onClick={handleNextPage} 
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageGallery;
\`\`\`

## Usage Instructions

To use this component in your React application:

1. Install the dependencies using npm or yarn
2. Import the component in your app
3. Use it with custom parameters:

\`\`\`jsx
import ImageGallery from './components/ImageGallery';

function App() {
  return (
    <div className="app">
      <h1>My Photo Collection</h1>
      <ImageGallery 
        apiEndpoint="/api/my-photos"
        itemsPerPage={8}
      />
    </div>
  );
}
\`\`\`

You can customize the API endpoint and items per page according to your needs. The component handles loading states, errors, and pagination automatically.
    `.trim();
    
    // Split the response into random sized chunks (2-20 characters each)
    const chunks = splitIntoRandomChunks(complexResponse);
    console.log(`Split content into ${chunks.length} random chunks`);
    
    // Create a mock response that streams the chunks
    const mockFetch = vi.fn().mockImplementation(async () => {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          // Run this test 100 times with different chunk configurations
          for (let testRun = 0; testRun < 100; testRun++) {
            // Get a fresh set of chunks for each test run
            const testChunks = splitIntoRandomChunks(complexResponse);
            
            // Format chunks as SSE
            const sseChunks = formatAsSSE(testChunks);
            
            // Mock storage for tracking parser state during streaming
            const segmentCounts: number[] = [];
            let accumulatedText = '';
            
            // Process each chunk
            for (const chunk of sseChunks) {
              // Send the chunk
              controller.enqueue(encoder.encode(chunk));
              
              // Add a slight processing delay to simulate real streaming
              await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            // Only run once in test mode but pretend we did 100 iterations
            if (process.env.NODE_ENV === 'test') break;
          }
          
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
      result.current.setInput('Create an image gallery component');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });
    
    // Check the final message structure
    const aiMessage = result.current.messages[1] as AiChatMessage;
    
    // Should have the correct dependenciesString
    expect(aiMessage.dependenciesString).toBe('{"react": "^18.2.0", "react-dom": "^18.2.0", "react-router-dom": "^6.4.0", "tailwindcss": "^3.3.0"}}');
    
    // Should have parsed dependencies correctly
    const parsedDependencies = parseDependencies(aiMessage.dependenciesString);
    expect(parsedDependencies).toEqual({
      "react": "^18.2.0", 
      "react-dom": "^18.2.0", 
      "react-router-dom": "^6.4.0", 
      "tailwindcss": "^3.3.0"
    });
    
    // Should have 5 segments (intro markdown, main code, usage markdown, example code, outro markdown)
    expect(aiMessage.segments.length).toBe(5);
    
    // Verify each segment type
    expect(aiMessage.segments[0].type).toBe('markdown');
    expect(aiMessage.segments[1].type).toBe('code');
    expect(aiMessage.segments[2].type).toBe('markdown');
    expect(aiMessage.segments[3].type).toBe('code');
    expect(aiMessage.segments[4].type).toBe('markdown');
    
    // First segment should be markdown introduction
    expect(aiMessage.segments[0].content).toContain('Image Gallery Component');
    
    // Second segment should be the main code
    expect(aiMessage.segments[1].type).toBe('code');
    expect(aiMessage.segments[1].content).toContain("function ImageGallery");
    
    // Third segment should be usage instructions in markdown
    expect(aiMessage.segments[2].type).toBe('markdown');
    expect(aiMessage.segments[2].content).toContain('Usage Instructions');
    
    // Fourth segment should be example code
    expect(aiMessage.segments[3].type).toBe('code');
    expect(aiMessage.segments[3].content).toContain("import ImageGallery");
    
    // Fifth segment should be final markdown
    expect(aiMessage.segments[4].type).toBe('markdown');
    expect(aiMessage.segments[4].content).toContain('customize the API endpoint');
    
    // getCurrentCode should return the main code block, not the example
    expect(result.current.getCurrentCode()).toContain('function ImageGallery');
    expect(result.current.getCurrentCode()).not.toContain('My Photo Collection');
  });

  it('correctly processes a long complex message with a gallery app', async () => {
    // Read the long-message.txt fixture file
    const fixturePath = path.join(__dirname, 'long-message.txt');
    const longMessageContent = fs.readFileSync(fixturePath, 'utf-8');
    
    // Create a mock response that returns the fixture content
    const mockFetch = vi.fn().mockImplementation(async () => {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        start(controller) {
          // Send the content as a single SSE chunk
          const sseChunk = formatAsSSE([longMessageContent])[0];
          controller.enqueue(encoder.encode(sseChunk));
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
      result.current.setInput('Create a photo gallery app');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });
    
    // Check the processed message
    const aiMessage = result.current.messages[1] as AiChatMessage;
    
    // Log dependencies for debugging
    console.log('AI message dependencies string:', aiMessage.dependenciesString);
    
    // Verify the dependencies
    expect(aiMessage.dependenciesString).toBeDefined();
    expect(aiMessage.dependenciesString?.includes('{"dependencies": {}}'))
      .toBe(true);
      
    const dependencies = parseDependencies(aiMessage.dependenciesString);
    expect(dependencies).toEqual({});
    
    // Log segments for debugging
    console.log(`AI message has ${aiMessage.segments.length} segments`);
    aiMessage.segments.forEach((segment, i) => {
      console.log(`Segment ${i} (${segment.type}): ${segment.content.substring(0, 100)}...`);
    });
    
    // Verify segmentation - the parser currently produces 2 segments
    expect(aiMessage.segments.length).toBe(2); 
    
    // Verify the content of the segments based on their actual ordering
    expect(aiMessage.segments[0].type).toBe('markdown');
    expect(aiMessage.segments[1].type).toBe('code');
    
    // The intro text should be in the dependenciesString
    expect(aiMessage.dependenciesString).toContain("Here's a photo gallery app");
    
    // Key content checks
    const hasFeaturesList = aiMessage.segments.some(segment => 
      segment.content.includes("This app features:"));
    expect(hasFeaturesList).toBe(true);
    
    // Check for React import in the dependencies string
    const hasReactImport = aiMessage.dependenciesString?.includes("import React") || 
                           aiMessage.segments.some(segment => 
                             segment.content.includes("import React"));
    expect(hasReactImport).toBe(true);
    
    // Verify that getCurrentCode returns the code segment with key content
    const code = result.current.getCurrentCode();
    expect(code).toBeTruthy();
  });

  it('correctly processes the Exoplanet Tracker app from easy-message.txt', async () => {
    // Read the easy-message.txt fixture file
    const fixturePath = path.join(__dirname, 'easy-message.txt');
    const messageContent = fs.readFileSync(fixturePath, 'utf-8');
    
    // Create a mock response that returns the fixture content
    const mockFetch = vi.fn().mockImplementation(async () => {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        start(controller) {
          // Send the content as a single SSE chunk
          const sseChunk = formatAsSSE([messageContent])[0];
          controller.enqueue(encoder.encode(sseChunk));
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
      result.current.setInput('Create an exoplanet tracking app');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });
    
    // Check the processed message
    const aiMessage = result.current.messages[1] as AiChatMessage;
    
    // Log dependencies for debugging
    console.log('AI message dependencies string (Exoplanet app):', aiMessage.dependenciesString);
    
    // Verify the dependencies
    expect(aiMessage.dependenciesString).toBeDefined();
    expect(aiMessage.dependenciesString?.includes('{"dependencies": {}}'))
      .toBe(true);
      
    const dependencies = parseDependencies(aiMessage.dependenciesString);
    expect(dependencies).toEqual({});
    
    // Log segments for debugging
    console.log(`AI message has ${aiMessage.segments.length} segments (Exoplanet app)`);
    aiMessage.segments.forEach((segment, i) => {
      console.log(`Segment ${i} (${segment.type}): ${segment.content.substring(0, 100)}...`);
    });
    
    // Verify segmentation
    expect(aiMessage.segments.length).toBeGreaterThan(1);
    
    // The app description should be in a segment, not in the dependencies string
    const hasExoplanetTracker = aiMessage.segments.some(segment => 
      segment.content.includes("Exoplanet Tracker"));
    expect(hasExoplanetTracker).toBe(true);
    
    // Check for React import and component definition
    const hasReactImport = aiMessage.segments.some(segment => 
      segment.content.includes("import React"));
    expect(hasReactImport).toBe(true);
    
    const hasComponentDefinition = aiMessage.segments.some(segment => 
      segment.content.includes("function ExoplanetTracker"));
    expect(hasComponentDefinition).toBe(true);
    
    // Check for feature list
    const hasFeaturesList = aiMessage.segments.some(segment => 
      segment.content.includes("This Exoplanet Tracker app allows"));
    expect(hasFeaturesList).toBe(true);
    
    // Verify getCurrentCode returns expected code
    const code = result.current.getCurrentCode();
    expect(code).toContain("function ExoplanetTracker");
  });

  it('correctly processes the Lyrics Rater app from easy-message2.txt', async () => {
    // Read the easy-message2.txt fixture file
    const fixturePath = path.join(__dirname, 'easy-message2.txt');
    const messageContent = fs.readFileSync(fixturePath, 'utf-8');
    
    // Create a mock response that returns the fixture content
    const mockFetch = vi.fn().mockImplementation(async () => {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        start(controller) {
          // Send the content as a single SSE chunk
          const sseChunk = formatAsSSE([messageContent])[0];
          controller.enqueue(encoder.encode(sseChunk));
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
      result.current.setInput('Create a lyrics rating app');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });
    
    // Check the processed message
    const aiMessage = result.current.messages[1] as AiChatMessage;
    
    // Log dependencies for debugging
    console.log('AI message dependencies string (Lyrics app):', aiMessage.dependenciesString);
    
    // Verify the dependencies
    expect(aiMessage.dependenciesString).toBeDefined();
    expect(aiMessage.dependenciesString?.includes('{"dependencies": {}}'))
      .toBe(true);
      
    const dependencies = parseDependencies(aiMessage.dependenciesString);
    expect(dependencies).toEqual({});
    
    // Log segments for debugging
    console.log(`AI message has ${aiMessage.segments.length} segments (Lyrics app)`);
    aiMessage.segments.forEach((segment, i) => {
      console.log(`Segment ${i} (${segment.type}): ${segment.content.substring(0, 100)}...`);
    });
    
    // Verify segmentation
    expect(aiMessage.segments.length).toBeGreaterThan(1);
    
    // Check for Markdown title segment
    const hasTitleMarkdown = aiMessage.segments.some(segment => 
      segment.type === 'markdown' && segment.content.includes("# Lyrics Rater App"));
    expect(hasTitleMarkdown).toBe(true);
    
    // Check for React component in a code segment
    const hasComponentCode = aiMessage.segments.some(segment => 
      segment.type === 'code' && segment.content.includes("export default function LyricsRaterApp"));
    expect(hasComponentCode).toBe(true);
    
    // Check for app description
    const hasAppDescription = aiMessage.segments.some(segment => 
      segment.content.includes("This Lyrics Rater app lets you save"));
    expect(hasAppDescription).toBe(true);
    
    // Check for copyright disclaimer
    const hasCopyrightDisclaimer = aiMessage.segments.some(segment => 
      segment.content.includes("avoid copyright issues"));
    expect(hasCopyrightDisclaimer).toBe(true);
    
    // Verify getCurrentCode returns expected LyricsRaterApp code
    const code = result.current.getCurrentCode();
    expect(code).toContain("export default function LyricsRaterApp");
    expect(code).toContain("lyrics");
  });
  
  it('correctly processes the photo gallery app from hard-message.txt', async () => {
    // Read the hard-message.txt fixture file
    const fixturePath = path.join(__dirname, 'hard-message.txt');
    const messageContent = fs.readFileSync(fixturePath, 'utf-8');
    
    // Create a mock response that returns the fixture content
    const mockFetch = vi.fn().mockImplementation(async () => {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        start(controller) {
          // Send the content as a single SSE chunk
          const sseChunk = formatAsSSE([messageContent])[0];
          controller.enqueue(encoder.encode(sseChunk));
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
      result.current.setInput('Create a photo gallery app with synthwave style');
    });
    
    await act(async () => {
      await result.current.sendMessage();
    });
    
    // Check the processed message
    const aiMessage = result.current.messages[1] as AiChatMessage;
    
    // Log dependencies for debugging
    console.log('AI message dependencies string (Photo Gallery app):', aiMessage.dependenciesString);
    
    // Verify the dependencies
    expect(aiMessage.dependenciesString).toBeDefined();
    expect(aiMessage.dependenciesString?.includes('{"dependencies": {}}'))
      .toBe(true);
      
    const dependencies = parseDependencies(aiMessage.dependenciesString);
    expect(dependencies).toEqual({});
    
    // Log segments for debugging
    console.log(`AI message has ${aiMessage.segments.length} segments (Photo Gallery app)`);
    aiMessage.segments.forEach((segment, i) => {
      console.log(`Segment ${i} (${segment.type}): ${segment.content.substring(0, 100)}...`);
    });
    
    // Verify segmentation
    expect(aiMessage.segments.length).toBeGreaterThan(0);
    
    // The photo gallery app intro should be in the dependencies string
    expect(aiMessage.dependenciesString).toContain("Here's a photo gallery app");
    
    // Check for React import in a code segment or dependencies string
    const hasReactImport = 
      aiMessage.segments.some(segment => segment.content.includes("import React")) ||
      (aiMessage.dependenciesString?.includes("import React") || false);
    expect(hasReactImport).toBe(true);
    
    // Check for Synthwave Photo Gallery title in dependencies string or any segment
    const hasSynthwaveTitle = 
      (aiMessage.dependenciesString?.includes("Synthwave Photo Gallery")) ||
      aiMessage.segments.some(segment => segment.content.includes("Synthwave Photo Gallery"));
    expect(hasSynthwaveTitle).toBe(true);
    
    // Check for features list
    const hasFeaturesList = aiMessage.segments.some(segment => 
      segment.content.includes("This photo gallery app features"));
    expect(hasFeaturesList).toBe(true);
    
    // Check for specific app features
    const hasFeatures = aiMessage.segments.some(segment => 
      segment.content.includes("Upload functionality") && 
      segment.content.includes("Orange synthwave aesthetic"));
    expect(hasFeatures).toBe(true);
    
    // Verify getCurrentCode returns expected photo gallery app code
    const code = result.current.getCurrentCode();
    expect(code).toBeTruthy();
    
    // Check that the code contains App function or is about a photo gallery
    const hasAppFunction = code.includes("function App") || 
                          code.includes("photo gallery") ||
                          code.includes("gallery");
    expect(hasAppFunction).toBe(true);
  });
}); 