import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import VibeIframeContainer from '../app/routes/vibe';

// Mock window.location.replace to prevent navigation errors
const mockReplace = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    replace: mockReplace,
    search: '',
  },
  writable: true,
});

// Mock the useParams hook to return a vibeSlug
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ vibeSlug: 'sound-panda-9086' }),
  };
});

describe('Vibe Route', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('redirects to the correct vibe subdomain URL', () => {
    render(
      <MemoryRouter initialEntries={['/vibe/sound-panda-9086']}>
        <Routes>
          <Route path="/vibe/:vibeSlug" element={<VibeIframeContainer />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that it shows redirecting message
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();

    // Check that window.location.replace was called with correct URL
    expect(mockReplace).toHaveBeenCalledWith('https://sound-panda-9086.vibesdiy.app/');
  });

  it('redirects without showing header content', () => {
    render(
      <MemoryRouter initialEntries={['/vibe/sound-panda-9086']}>
        <Routes>
          <Route path="/vibe/:vibeSlug" element={<VibeIframeContainer />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that it shows redirecting message
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();

    // Check that there's no header or formatted title
    expect(screen.queryByText('Sound Panda 9086')).not.toBeInTheDocument();
    expect(screen.queryByText('Remix')).not.toBeInTheDocument();

    // Ensure redirect was called
    expect(mockReplace).toHaveBeenCalledWith('https://sound-panda-9086.vibesdiy.app/');
  });
});
