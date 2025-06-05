import './setup';
import { renderHook } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { useViewState } from '../../app/utils/ViewState';
import { useLocation, useParams } from 'react-router-dom';
import { mockNavigate, mockSessionId, mockTitle } from './setup';


describe('useViewState streaming', () => {
  test('FIXED: View stays in code view when first code lines arrive during streaming', () => {
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
          isStreaming: true,
          previewReady: false,
        },
      }
    );
    unmount();
    const { rerender } = renderHook(
      (props) => {
        hookResult = useViewState(props);
        return hookResult;
      },
      {
        initialProps: {
          code: '',
          isStreaming: true,
          previewReady: false,
        },
      }
    );
    vi.mocked(useParams).mockReturnValue({ sessionId: mockSessionId, title: mockTitle });
    rerender({
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("Hello World")',
      isStreaming: true,
      previewReady: true,
    } as any);
    expect(mockNavigate).toHaveBeenCalledWith(`/chat/${mockSessionId}/${mockTitle}/app`, {
      replace: true,
    });
    expect(hookResult.displayView).toBe('preview');
    rerender({
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("Hello World")',
      isStreaming: false,
      previewReady: true,
    } as any);
    expect(mockNavigate).toHaveBeenCalledWith(`/chat/${mockSessionId}/${mockTitle}/app`, {
      replace: true,
    });
  });
});
