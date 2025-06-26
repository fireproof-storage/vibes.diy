import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import VibespaceComponent from '../app/components/VibespaceComponent';

// Mock the Fireproof hook
vi.mock('use-fireproof', () => ({
  useFireproof: vi.fn(() => ({
    useAllDocs: vi.fn(() => ({ docs: [] })),
  })),
}));

// Mock the vibespace theme components
vi.mock('../app/components/vibespace/Basic', () => ({
  default: ({ userId }: { userId: string }) => (
    <div data-testid="basic-theme">Basic theme for {userId}</div>
  ),
}));

vi.mock('../app/components/vibespace/Wild', () => ({
  default: ({ userId }: { userId: string }) => (
    <div data-testid="wild-theme">Wild theme for {userId}</div>
  ),
}));

vi.mock('../app/components/vibespace/ExplodingBrain', () => ({
  default: ({ userId }: { userId: string }) => (
    <div data-testid="brain-theme">Brain theme for {userId}</div>
  ),
}));

vi.mock('../app/components/vibespace/Cyberpunk', () => ({
  default: ({ userId }: { userId: string }) => (
    <div data-testid="cyberpunk-theme">Cyberpunk theme for {userId}</div>
  ),
}));

// Mock VibesDIYLogo
vi.mock('../app/components/VibesDIYLogo', () => ({
  default: ({ height }: { height: number }) => (
    <div data-testid="vibes-logo" style={{ height: `${height}px` }}>
      Vibes DIY Logo
    </div>
  ),
}));

// Mock SimpleAppLayout
vi.mock('../app/components/SimpleAppLayout', () => ({
  default: ({
    children,
    headerLeft,
  }: {
    children: React.ReactNode;
    headerLeft: React.ReactNode;
  }) => (
    <div>
      <header>{headerLeft}</header>
      <main>{children}</main>
    </div>
  ),
}));

const renderWithRouter = (component: React.ReactElement, initialEntries = ['/']) => {
  return render(<MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>);
};

describe('VibespaceComponent', () => {
  it('should render starfield for non-existent user with tildeId', () => {
    renderWithRouter(<VibespaceComponent tildeId="nonexistentuser" />);

    expect(screen.getByText('SPACE')).toBeInTheDocument();
    expect(screen.getByText('NOT FOUND')).toBeInTheDocument();
    expect(screen.getByText('~nonexistentuser')).toBeInTheDocument();
    expect(screen.getByText('→ HOME')).toBeInTheDocument();
  });

  it('should render starfield for non-existent user with atId', () => {
    renderWithRouter(<VibespaceComponent atId="nonexistentuser" />);

    expect(screen.getByText('SPACE')).toBeInTheDocument();
    expect(screen.getByText('NOT FOUND')).toBeInTheDocument();
    expect(screen.getByText('@nonexistentuser')).toBeInTheDocument();
    expect(screen.getByText('→ HOME')).toBeInTheDocument();
  });

  it('should render invalid user space message when no ID provided', () => {
    renderWithRouter(<VibespaceComponent />);

    expect(screen.getByText('Invalid user space')).toBeInTheDocument();
  });

  it('should accept clean user IDs without prefix symbols', () => {
    // Test that the component receives clean IDs (no ~ or @ prefix)
    renderWithRouter(<VibespaceComponent tildeId="z2KBppKuUFKYxQvuj9" />);

    // Should show the clean ID with the appropriate prefix in the starfield
    expect(screen.getByText('~z2KBppKuUFKYxQvuj9')).toBeInTheDocument();
  });

  it('should handle @ prefix correctly', () => {
    renderWithRouter(<VibespaceComponent atId="someuser123" />);

    // Should show the clean ID with @ prefix
    expect(screen.getByText('@someuser123')).toBeInTheDocument();
  });

  it('should render Vibes DIY logo in starfield', () => {
    renderWithRouter(<VibespaceComponent tildeId="testuser" />);

    expect(screen.getByTestId('vibes-logo')).toBeInTheDocument();
  });

  it('should have starfield animation styles', () => {
    renderWithRouter(<VibespaceComponent tildeId="testuser" />);

    // Check that starfield container has the right classes
    const starfieldContainer = screen.getByText('SPACE').closest('.min-h-screen');
    expect(starfieldContainer).toHaveClass('bg-black');
  });
});
