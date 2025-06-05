import { renderHook } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { useViewState } from '../../app/utils/ViewState';
import { mockNavigate, mockSessionId, mockTitle } from './setup';

import './setup';

describe('useViewState streaming', () => {
  test('should display code view when streaming starts for first message', () => {
    let hookResult: any;
    const { unmount } = renderHook(
      (props) => {
        hookResult = useViewState(props);
        return hookResult;
      },
      {
        initialProps: {
          sessionId: mockSessionId,
          title: mockTitle,
          code: '',
          isStreaming: false,
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
          sessionId: mockSessionId,
          title: mockTitle,
          code: '',
          isStreaming: false,
          previewReady: false,
        },
      }
    );
    rerender({
      sessionId: mockSessionId,
      title: mockTitle,
      code: 'console.log("hello")',
      isStreaming: true,
      previewReady: false,
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
