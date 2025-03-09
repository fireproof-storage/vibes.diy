import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '../app/components/ChatInput';

// Create mock state and functions we can control
let inputValue = '';
let isGeneratingValue = false;
const setInput = vi.fn((value) => {
  inputValue = value;
});
const handleSendMessage = vi.fn();

// Setup a more appropriate mock for the context
vi.mock('../app/context/ChatContext', () => ({
  useChatContext: () => ({
    input: inputValue,
    setInput,
    isGenerating: isGeneratingValue,
    handleSendMessage,
  }),
}));

describe('ChatInput', () => {
  beforeEach(() => {
    // Reset mocks and values before each test
    vi.resetAllMocks();
    inputValue = '';
    isGeneratingValue = false;
  });

  it('renders correctly', () => {
    render(<ChatInput />);
    expect(screen.getByPlaceholderText('Describe the app you want to create...')).toBeDefined();
  });

  it('calls setInput when text is entered', () => {
    render(<ChatInput />);

    const textArea = screen.getByPlaceholderText('Describe the app you want to create...');
    fireEvent.change(textArea, { target: { value: 'Hello world' } });

    expect(setInput).toHaveBeenCalledWith('Hello world');
  });

  it('calls handleSendMessage when send button is clicked', () => {
    render(<ChatInput />);

    const sendButton = screen.getByLabelText('Send message');
    fireEvent.click(sendButton);

    expect(handleSendMessage).toHaveBeenCalledTimes(1);
  });

  it('disables the text area and send button when isGenerating is true', () => {
    isGeneratingValue = true;

    render(<ChatInput />);

    const textArea = screen.getByPlaceholderText('Describe the app you want to create...');
    const sendButton = screen.getByLabelText('Generating');

    expect(textArea).toBeDisabled();
    expect(sendButton).toBeDisabled();

    fireEvent.click(sendButton);
    expect(handleSendMessage).not.toHaveBeenCalled();
  });

  it('calls handleSendMessage when Enter is pressed', () => {
    render(<ChatInput />);

    const textArea = screen.getByPlaceholderText('Describe the app you want to create...');
    fireEvent.keyDown(textArea, { key: 'Enter', shiftKey: false });

    expect(handleSendMessage).toHaveBeenCalledTimes(1);
  });

  it('does not call handleSendMessage when Enter is pressed with Shift', () => {
    render(<ChatInput />);

    const textArea = screen.getByPlaceholderText('Describe the app you want to create...');
    fireEvent.keyDown(textArea, { key: 'Enter', shiftKey: true });

    expect(handleSendMessage).not.toHaveBeenCalled();
  });
});
