import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '../app/components/ChatInput';

// Create mock functions we can control
const onSend = vi.fn();
const onChange = vi.fn();
const onKeyDown = vi.fn();

// Create a ref we can use
const inputRef = { current: null };

describe('ChatInput Component', () => {
  beforeEach(() => {
    // Reset mocks and values before each test
    vi.resetAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <ChatInput
        value=""
        onChange={onChange}
        onSend={onSend}
        onKeyDown={onKeyDown}
        disabled={false}
        inputRef={inputRef}
        isStreaming={false}
        docsLength={0}
      />
    );
    expect(screen.getByPlaceholderText('I want to build...')).toBeDefined();
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
        isStreaming={false}
        docsLength={0}
      />
    );

    const textArea = screen.getByPlaceholderText('I want to build...');
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
        isStreaming={false}
        docsLength={0}
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
        isStreaming={false}
        docsLength={0}
      />
    );

    const textArea = screen.getByPlaceholderText('I want to build...');
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
        isStreaming={false}
        docsLength={0}
      />
    );

    const textArea = screen.getByPlaceholderText('I want to build...');
    fireEvent.keyDown(textArea, { key: 'Enter', shiftKey: false });

    expect(onKeyDown).toHaveBeenCalled();
  });
});
