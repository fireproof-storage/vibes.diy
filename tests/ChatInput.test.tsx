import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '../app/components/ChatInput';
import type { ChatState } from '../app/types/chat';

// Create mock functions we can control
const onSend = vi.fn();
const setInput = vi.fn();
const sendMessage = vi.fn();

// Create a ref we can use
const inputRef = { current: null };

describe('ChatInput Component', () => {
  // Create a base mock chatState object
  let mockChatState: ChatState;

  beforeEach(() => {
    // Reset mocks and values before each test
    vi.resetAllMocks();

    // Initialize mockChatState for each test with all required properties
    mockChatState = {
      input: '',
      isStreaming: false,
      inputRef: inputRef,
      docs: [],
      setInput: setInput,
      sendMessage: sendMessage,
      codeReady: false,
      title: '',
      addScreenshot: vi.fn().mockResolvedValue(undefined),
      setSelectedResponseId: vi.fn(),
      selectedSegments: [],
      needsNewKey: false,
      setNeedsNewKey: vi.fn(),
      immediateErrors: [],
      advisoryErrors: [],
      addError: vi.fn(),
      sessionId: 'test-session-id',
    };
  });

  it('renders without crashing', () => {
    render(<ChatInput chatState={mockChatState} onSend={onSend} />);
    expect(screen.getByPlaceholderText('I want to build...')).toBeDefined();
  });

  it('calls chatState.setInput when text is entered', () => {
    render(<ChatInput chatState={mockChatState} onSend={onSend} />);

    const textArea = screen.getByPlaceholderText('I want to build...');
    fireEvent.change(textArea, { target: { value: 'Hello world' } });

    expect(setInput).toHaveBeenCalledWith('Hello world');
  });

  it('calls sendMessage and onSend when send button is clicked', () => {
    render(<ChatInput chatState={mockChatState} onSend={onSend} />);

    const sendButton = screen.getByLabelText('Send message');
    fireEvent.click(sendButton);

    expect(sendMessage).toHaveBeenCalledWith('');
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('disables send button when isStreaming is true', () => {
    // Set isStreaming to true for this test
    mockChatState.isStreaming = true;

    render(<ChatInput chatState={mockChatState} onSend={onSend} />);

    const textArea = screen.getByPlaceholderText('Continue coding...');
    const sendButton = screen.getByLabelText('Generating');

    expect(textArea).not.toBeDisabled();
    expect(sendButton).toBeDisabled();

    fireEvent.click(sendButton);
    expect(onSend).not.toHaveBeenCalled();
  });

  it('calls sendMessage and onSend when Enter is pressed', () => {
    render(<ChatInput chatState={mockChatState} onSend={onSend} />);

    const textArea = screen.getByPlaceholderText('I want to build...');
    fireEvent.keyDown(textArea, { key: 'Enter', shiftKey: false });

    expect(sendMessage).toHaveBeenCalledWith('');
    expect(onSend).toHaveBeenCalled();
  });

  it('does not call sendMessage or onSend when Enter is pressed with Shift', () => {
    render(<ChatInput chatState={mockChatState} onSend={onSend} />);

    const textArea = screen.getByPlaceholderText('I want to build...');
    fireEvent.keyDown(textArea, { key: 'Enter', shiftKey: true });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call sendMessage or onSend when Enter is pressed while streaming', () => {
    // Set isStreaming to true for this test
    mockChatState.isStreaming = true;

    render(<ChatInput chatState={mockChatState} onSend={onSend} />);

    const textArea = screen.getByPlaceholderText('Continue coding...');
    fireEvent.keyDown(textArea, { key: 'Enter', shiftKey: false });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call sendMessage or onSend when button is clicked while streaming', () => {
    mockChatState.isStreaming = true;

    render(<ChatInput chatState={mockChatState} onSend={onSend} />);

    // The button should be disabled, but let's try to click it anyway
    const sendButton = screen.getByLabelText('Generating');
    fireEvent.click(sendButton);

    expect(sendMessage).not.toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
