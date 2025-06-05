import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SessionSidebar from '../../app/components/SessionSidebar';
import { mockSessionSidebarProps } from '../mockData';
import { MockThemeProvider } from '../utils/MockThemeProvider';
import './setup';

describe('SessionSidebar unmount', () => {
  it('should remove event listener on unmount', () => {
    const props = { ...mockSessionSidebarProps };
    const { unmount } = render(
      <MockThemeProvider>
        <SessionSidebar {...props} />
      </MockThemeProvider>
    );
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'needsLoginTriggered',
      expect.any(Function)
    );
  });
});
