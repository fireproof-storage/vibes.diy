import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import VibeIframeContainer from '../app/routes/vibe';

// Mock the useParams hook to return a vibeSlug
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ vibeSlug: 'sound-panda-9086' }),
  };
});

describe('Vibe Route', () => {
  it('renders the iframe with the correct src URL', () => {
    render(
      <MemoryRouter initialEntries={['/vibe/sound-panda-9086']}>
        <Routes>
          <Route path="/vibe/:vibeSlug" element={<VibeIframeContainer />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that the iframe has the correct src attribute
    const iframe = screen.getByTitle('Vibe: sound-panda-9086');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('src')).toBe('https://sound-panda-9086.vibecode.garden/');
  });

  it('displays a header with the formatted title and Remix button', () => {
    render(
      <MemoryRouter initialEntries={['/vibe/sound-panda-9086']}>
        <Routes>
          <Route path="/vibe/:vibeSlug" element={<VibeIframeContainer />} />
        </Routes>
      </MemoryRouter>
    );

    // Check for the formatted title in the header
    const title = screen.getByText('Sound Panda 9086');
    expect(title).toBeInTheDocument();

    // Check for the Remix button
    const remixButton = screen.getByRole('link', { name: /remix/i });
    expect(remixButton).toBeInTheDocument();
    expect(remixButton.getAttribute('href')).toBe('/remix/sound-panda-9086');

    // Find the label that indicates we're viewing a published vibe
    const viewingLabel = screen.getByText('Viewing Published Vibe');
    expect(viewingLabel).toBeInTheDocument();
  });
});
