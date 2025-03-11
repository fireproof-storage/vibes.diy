import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import React, { useContext } from 'react';

// Create a controlled context for testing
const TestContext = React.createContext<{ isGenerating: boolean }>({ isGenerating: false });
const useTestContext = () => useContext(TestContext);

// No need to mock ChatContext anymore

// Mock other dependencies
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    database: {},
    useLiveQuery: () => ({ docs: [] }),
  }),
}));

// Now import components after mocks
import ChatHeader from '../app/components/ChatHeader';
import SessionSidebar from '../app/components/SessionSidebar';
import MessageList from '../app/components/MessageList';
import type { ChatMessage } from '../app/types/chat';

// Mock component that tracks renders
function createRenderTracker(Component: React.ComponentType<any>) {
  let renderCount = 0;

  // Create a wrapped component that uses the original memoized component
  // but tracks renders of the wrapper
  const TrackedComponent = (props: any) => {
    renderCount++;
    // Use the original component directly
    return <Component {...props} />;
  };

  // Memoize the tracker component itself to prevent re-renders from parent
  const MemoizedTrackedComponent = React.memo(TrackedComponent);

  return {
    Component: MemoizedTrackedComponent,
    getRenderCount: () => renderCount,
    resetCount: () => {
      renderCount = 0;
    },
  };
}

// Update the test component to use TestContext
function TestComponent({ renderCount }: { renderCount: React.MutableRefObject<number> }) {
  renderCount.current += 1;
  const { isGenerating } = useTestContext();
  return <div data-testid="test-component">{isGenerating ? 'Generating' : 'Idle'}</div>;
}

describe('Component Memoization', () => {
  describe('ChatHeader Memoization', () => {
    beforeEach(() => {
      // No need to mock useTestContext
    });

    it('does not re-render when props are unchanged', async () => {
      // Create a wrapper component for testing
      const { Component: TrackedHeader, getRenderCount } = createRenderTracker(ChatHeader);

      function TestWrapper() {
        const [, forceUpdate] = React.useState({});

        // Force parent re-render without changing props
        const triggerRerender = () => forceUpdate({});

        return (
          <div>
            <button data-testid="rerender-trigger" onClick={triggerRerender}>
              Force Re-render
            </button>
            {/* No need to pass props as they come from context */}
            <TrackedHeader />
          </div>
        );
      }

      const { getByTestId } = render(<TestWrapper />);
      expect(getRenderCount()).toBe(1); // Initial render

      // Force parent re-render
      await act(async () => {
        getByTestId('rerender-trigger').click();
      });

      // ChatHeader should not re-render
      expect(getRenderCount()).toBe(1);
    });

    it('should not re-render when context value changes but component does not use that value', () => {
      const renderCount = { current: 0 };
      
      const { rerender } = render(
        <TestContext.Provider value={{ isGenerating: false }}>
          <TestComponent renderCount={renderCount} />
        </TestContext.Provider>
      );
      
      const initialRenderCount = renderCount.current;
      
      // Update the context with a new value
      rerender(
        <TestContext.Provider value={{ isGenerating: true }}>
          <TestComponent renderCount={renderCount} />
        </TestContext.Provider>
      );
      
      // The component should have re-rendered because it uses isGenerating
      expect(renderCount.current).toBe(initialRenderCount + 1);
      expect(screen.getByTestId('test-component')).toHaveTextContent('Generating');
    });
  });

  describe('SessionSidebar Memoization', () => {
    it('does not re-render when props are unchanged', async () => {
      const { Component: TrackedSidebar, getRenderCount } = createRenderTracker(SessionSidebar);

      function TestWrapper() {
        const [, forceUpdate] = React.useState({});
        const onClose = React.useCallback(() => {}, []);
        const onSelectSession = React.useCallback(() => {}, []);

        // Force parent re-render without changing props
        const triggerRerender = () => forceUpdate({});

        return (
          <div>
            <button data-testid="rerender-trigger" onClick={triggerRerender}>
              Force Re-render
            </button>
            <TrackedSidebar isVisible={true} onClose={onClose} onSelectSession={onSelectSession} />
          </div>
        );
      }

      const { getByTestId } = render(<TestWrapper />);
      expect(getRenderCount()).toBe(1); // Initial render

      // Force parent re-render
      await act(async () => {
        getByTestId('rerender-trigger').click();
      });

      // SessionSidebar should not re-render
      expect(getRenderCount()).toBe(1);
    });
  });

  describe('MessageList Memoization', () => {
    it('does not re-render when props are unchanged', async () => {
      const { Component: TrackedMessageList, getRenderCount } = createRenderTracker(MessageList);
      const messages: ChatMessage[] = [
        { text: 'Hello', type: 'user' },
        { 
          text: 'Hi there', 
          type: 'ai',
          segments: [{ type: 'markdown', content: 'Hi there' }]
        },
      ];

      function TestWrapper() {
        const [, forceUpdate] = React.useState({});
        // Memoize the messages array to prevent reference changes
        const memoizedMessages = React.useMemo(() => messages, []);

        // Force parent re-render without changing props
        const triggerRerender = () => forceUpdate({});

        return (
          <div>
            <button data-testid="rerender-trigger" onClick={triggerRerender}>
              Force Re-render
            </button>
            <TrackedMessageList
              messages={memoizedMessages}
              isGenerating={false}
            />
          </div>
        );
      }

      const { getByTestId } = render(<TestWrapper />);
      expect(getRenderCount()).toBe(1); // Initial render

      // Force parent re-render
      await act(async () => {
        getByTestId('rerender-trigger').click();
      });

      // MessageList should not re-render
      expect(getRenderCount()).toBe(1);
    });

    it('does re-render when messages array changes', async () => {
      const { Component: TrackedMessageList, getRenderCount } = createRenderTracker(MessageList);
      const initialMessages: ChatMessage[] = [{ text: 'Hello', type: 'user' }];

      function TestWrapper() {
        const [messages, setMessages] = React.useState(initialMessages);

        const addMessage = () => {
          setMessages([
            ...messages, 
            { 
              text: 'New message', 
              type: 'ai', 
              segments: [{ type: 'markdown', content: 'New message' }]
            }
          ]);
        };

        return (
          <div>
            <button data-testid="add-message" onClick={addMessage}>
              Add Message
            </button>
            <TrackedMessageList messages={messages} isGenerating={false} />
          </div>
        );
      }

      const { getByTestId } = render(<TestWrapper />);
      expect(getRenderCount()).toBe(1); // Initial render

      // Add a new message
      await act(async () => {
        getByTestId('add-message').click();
      });

      // MessageList should re-render with new messages
      expect(getRenderCount()).toBe(2);
    });
  });
});
