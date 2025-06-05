import { renderHook } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { useViewState } from '../../app/utils/ViewState';
import { useLocation, useParams } from 'react-router-dom';
import { mockNavigate, mockSessionId, mockTitle } from './setup';

import './setup';

describe('useViewState streaming', () => {
  test('should handle initial app flow from root URL with correct navigation timing', () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/' } as any);
    vi.mocked(useParams).mockReturnValue({});
    let hookResult: any;
    const { unmount } = renderHook(
      (props) => {
        hookResult = useViewState(props);
        return hookResult;
      },
      {
        initialProps: {
          code: '',
          isStreaming: false,
          previewReady: false,
        },
      }
    );
    expect(hookResult.currentView).toBe('preview');
    expect(mockNavigate).not.toHaveBeenCalled();
    unmount();
    const { rerender } = renderHook(
      (props) => {
        hookResult = useViewState(props);
        return hookResult;
      },
      {
        initialProps: {
          code: 'console.log("hello world")',
          isStreaming: true,
          previewReady: false,
        },
      }
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    vi.mocked(useParams).mockReturnValue({ sessionId: mockSessionId, title: mockTitle });
    rerender({
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("hello world")',
      isStreaming: true,
      previewReady: false,
    } as any);
    expect(mockNavigate).not.toHaveBeenCalled();
    rerender({
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("hello world")',
      isStreaming: true,
      previewReady: true,
    } as any);
    expect(mockNavigate).toHaveBeenCalledWith(`/chat/${mockSessionId}/${mockTitle}/app`, {
      replace: true,
    });
    rerender({
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("test")',
      isStreaming: false,
      previewReady: true,
    } as any);
    expect(mockNavigate).toHaveBeenCalledWith(`/chat/${mockSessionId}/${mockTitle}/app`, {
      replace: true,
    });
  });
});
