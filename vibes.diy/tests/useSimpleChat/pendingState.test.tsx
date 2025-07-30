import { act, renderHook } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import { createWrapper, formatAsSSE } from './setup';
import { useSimpleChat } from '../../app/hooks/useSimpleChat';
import { useSession } from '../../app/hooks/useSession';
import type { ChatMessageDocument } from '~/types/chat';

describe('useSimpleChat', () => {
  it('handles pending AI message state correctly', async () => {
    const mockResponseText = 'This is the final AI response.';
    const generatedId = 'test-pending-message-id';

    const mockFetch = vi.fn().mockImplementation(async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const chunks = ['This is the final ', 'AI response.'];
          const sseChunks = formatAsSSE(chunks);
          sseChunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
          controller.close();
        },
      });
      return { ok: true, body: stream, status: 200, headers: new Headers() } as Response;
    });
    window.fetch = mockFetch;

    const wrapper = createWrapper();
    const { result } = renderHook(() => useSimpleChat('test-session-id'), { wrapper });

    const mockPut = vi.fn(async () => {
      return Promise.resolve({ id: generatedId });
    });
    vi.mocked(useSession)(undefined).sessionDatabase.put = mockPut as unknown as ReturnType<
      typeof useSession
    >['sessionDatabase']['put'];

    act(() => {
      result.current.setInput('Trigger stream');
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    act(() => {
      const sessionHookResult = vi.mocked(useSession)(undefined);
      const mockDocs = sessionHookResult.docs;
      const docToAdd = {
        _id: generatedId,
        type: 'ai',
        text: mockResponseText,
        session_id: 'test-session-id',
        created_at: Date.now(),
      } as ChatMessageDocument;
      mockDocs.push(docToAdd);
      result.current.setInput('');
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.setInput('refresh again');
    });
  });
});
