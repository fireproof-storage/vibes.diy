import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import StructuredMessage from '../app/components/StructuredMessage';

describe('Streaming Content Display', () => {
  test('shows markdown content immediately when streaming', () => {
    // Arrange: Create a test message with some markdown content
    const segments = [
      { type: 'markdown' as const, content: 'Here is a rainbow todo app' },
      { type: 'code' as const, content: 'console.log("hello");' },
    ];

    // Act: Render the component with isStreaming=true
    render(<StructuredMessage segments={segments} isStreaming={true} />);

    // Assert: The markdown content should be visible
    expect(screen.getByText('Here is a rainbow todo app')).toBeInTheDocument();
  });

  test('should not show "Thinking..." when content is available', () => {
    // Our streaming setup should not be showing "Thinking..." if we have content
    // This is a placeholder for checking that the UI behavior is correct
    // In the real app, "Thinking..." indicator and content should be mutually exclusive
    // This test would need to be expanded using the appropriate component hierarchy
  });
});
