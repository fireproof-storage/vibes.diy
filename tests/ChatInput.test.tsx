import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '../app/components/ChatInput';

// Create mock state and functions we can control
let inputValue = '';
const onChange = vi.fn((e) => {
  inputValue = e.target.value;
});
const onSend = vi.fn();
const onKeyDown = vi.fn((e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    onSend();
  }
});
const inputRef = { current: null };

describe('ChatInput', () => {
  beforeEach(() => {
    // Reset mocks and values before each test
    vi.resetAllMocks();
    inputValue = '';
  });

  it('renders correctly', () => {
    render(
      <ChatInput
        value=""
        onChange={onChange}
        onSend={onSend}
        onKeyDown={onKeyDown}
        disabled={false}
        inputRef={inputRef}
      />
    );
    expect(screen.getByPlaceholderText('Vibe coding? Just Fireproof it.')).toBeDefined();
  });

  it('calls onChange when text is entered', () => {
    render(
      <ChatInput
        value=""
        onChange={onChange}
        onSend={onSend}
        onKeyDown={onKeyDown}
        disabled={false}
        inputRef={inputRef}
      />
    );

    const textArea = screen.getByPlaceholderText('Vibe coding? Just Fireproof it.');
    fireEvent.change(textArea, { target: { value: 'Hello world' } });

    expect(onChange).toHaveBeenCalled();
  });

  it('calls onSend when send button is clicked', () => {
    render(
      <ChatInput
        value=""
        onChange={onChange}
        onSend={onSend}
        onKeyDown={onKeyDown}
        disabled={false}
        inputRef={inputRef}
      />
    );

    const sendButton = screen.getByLabelText('Send message');
    fireEvent.click(sendButton);

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('disables the text area and send button when disabled is true', () => {
    render(
      <ChatInput
        value=""
        onChange={onChange}
        onSend={onSend}
        onKeyDown={onKeyDown}
        disabled={true}
        inputRef={inputRef}
      />
    );

    const textArea = screen.getByPlaceholderText('Vibe coding? Just Fireproof it.');
    const sendButton = screen.getByLabelText('Generating');

    expect(textArea).toBeDisabled();
    expect(sendButton).toBeDisabled();

    fireEvent.click(sendButton);
    expect(onSend).not.toHaveBeenCalled();
  });

  it('calls onKeyDown when Enter is pressed', () => {
    render(
      <ChatInput
        value=""
        onChange={onChange}
        onSend={onSend}
        onKeyDown={onKeyDown}
        disabled={false}
        inputRef={inputRef}
      />
    );

    const textArea = screen.getByPlaceholderText('Vibe coding? Just Fireproof it.');
    fireEvent.keyDown(textArea, { key: 'Enter', shiftKey: false });

    expect(onKeyDown).toHaveBeenCalled();
  });
});
