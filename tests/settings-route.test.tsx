import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settings from '../app/routes/settings';

// Create mock objects outside the mock function to access them in tests
const mockMerge = vi.fn();
const mockSave = vi.fn().mockResolvedValue({ ok: true });
let mockSettings = {
  _id: 'user_settings',
  stylePrompt: '',
  userPrompt: '',
};

// Mock the modules
vi.mock('../app/hooks/useSession', () => ({
  useSession: () => ({
    mainDatabase: { name: 'test-db' },
  }),
}));

// Mock Fireproof
vi.mock('use-fireproof', () => ({
  useFireproof: () => ({
    useDocument: () => ({
      doc: mockSettings,
      merge: mockMerge.mockImplementation((newValues) => {
        mockSettings = { ...mockSettings, ...newValues };
      }),
      save: mockSave,
    }),
  }),
}));

// Mock SimpleAppLayout component
vi.mock('../app/components/SimpleAppLayout', () => ({
  default: ({
    headerLeft,
    children,
  }: {
    headerLeft: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="simple-app-layout">
      <div data-testid="header-left">{headerLeft}</div>
      <div data-testid="content-area">{children}</div>
    </div>
  ),
}));

// Mock HomeIcon component
vi.mock('../app/components/SessionSidebar/HomeIcon', () => ({
  HomeIcon: () => <div data-testid="home-icon" />,
}));

describe('Settings Route', () => {
  beforeEach(() => {
    // Reset mocks between tests
    vi.clearAllMocks();

    // Reset DOM
    document.body.innerHTML = '';

    // Reset Fireproof mock settings
    mockSettings = {
      _id: 'user_settings',
      stylePrompt: '',
      userPrompt: '',
    };

    // Use fake timers for setTimeout
    vi.useFakeTimers();

    // Create a simple mock for the notification system
    const originalAppendChild = document.body.appendChild.bind(document.body);
    const originalRemoveChild = document.body.removeChild.bind(document.body);

    // Mock appendChild to track notification elements
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      return originalAppendChild(node);
    });

    // Mock removeChild
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => {
      return originalRemoveChild(node);
    });
  });

  const renderSettings = () => render(<Settings />);

  it('renders the settings page with correct title and sections', () => {
    renderSettings();

    // Check for header content
    const headerSection = screen.getByTestId('header-left');
    expect(headerSection).toBeInTheDocument();

    // Check for main content sections
    expect(screen.getByText('Application Settings')).toBeInTheDocument();
    expect(screen.getByText('Style Prompt')).toBeInTheDocument();
    expect(screen.getByText('User Prompt')).toBeInTheDocument();
    expect(screen.getByText('Save Settings')).toBeInTheDocument();
  });

  it('allows updating style prompt via text input', async () => {
    // We already have access to the mocks from the top-level variables

    renderSettings();

    // Verify the merge function is called with the right value
    const styleInput = screen.getByPlaceholderText('Enter or select style prompt...');
    fireEvent.change(styleInput, { target: { value: 'custom style prompt' } });

    // Only check that the merge function was called with the right value
    expect(mockMerge).toHaveBeenCalledWith({ stylePrompt: 'custom style prompt' });
  });

  it('allows selecting a style prompt from suggestions', async () => {
    // We already have access to the mocks from the top-level variables

    renderSettings();

    // Click on a suggestion button
    const suggestionButton = screen.getByText('synthwave');
    fireEvent.click(suggestionButton);

    // Check that merge was called with the right value
    expect(mockMerge).toHaveBeenCalledWith({
      stylePrompt: 'synthwave (80s digital aesthetic)',
    });

    // Run the setTimeout that focuses the input
    vi.runAllTimers();
  });

  it('allows updating user prompt via textarea', async () => {
    // We already have access to the mocks from the top-level variables

    renderSettings();

    const userPromptTextarea = screen.getByPlaceholderText(
      'Enter custom instructions for the AI...'
    );
    fireEvent.change(userPromptTextarea, { target: { value: 'My custom instructions' } });

    // Only check that the merge function was called with the right value
    expect(mockMerge).toHaveBeenCalledWith({ userPrompt: 'My custom instructions' });
  });

  it('calls save when the save button is clicked', async () => {
    // We already have access to the mockSave from the top-level variable

    renderSettings();

    // Find the save button
    const saveButton = screen.getByRole('button', { name: /save settings/i });

    // Initially, the button should be disabled
    expect(saveButton).toBeDisabled();

    // Simulate changing a setting to enable the button
    const styleInput = screen.getByPlaceholderText(
      'Enter or select style prompt...'
    ) as HTMLInputElement;
    await fireEvent.change(styleInput, { target: { value: 'new style' } });
    expect(saveButton).not.toBeDisabled(); // Now it should be enabled

    // Click save button
    await fireEvent.click(saveButton);

    // Check that save was called
    expect(mockSave).toHaveBeenCalled();
  });

  it('successfully saves settings and shows a success UI element', async () => {
    // Create a spy for document.createElement
    const createElementSpy = vi.spyOn(document, 'createElement');

    renderSettings();

    // Simulate changing the style prompt to enable the save button
    const styleInput = screen.getByPlaceholderText('Enter or select style prompt...');
    await fireEvent.change(styleInput, { target: { value: 'new test style' } });

    // Find the button and click it
    const saveButton = screen.getByRole('button', { name: /save settings/i });
    expect(saveButton).not.toBeDisabled(); // Ensure it's enabled before click
    await fireEvent.click(saveButton);

    // Verify save was called
    expect(mockSave).toHaveBeenCalled();

    // Verify a div was created for the notification
    expect(createElementSpy).toHaveBeenCalledWith('div');
  });

  it('highlights the selected style prompt suggestion', async () => {
    // We already have access to the mockSettings from the top-level variable

    // Set the mock settings to have a style prompt
    mockSettings.stylePrompt = 'brutalist web (raw, grid-heavy)';

    renderSettings();

    // The brutalist button should have the selected class
    const brutalistButton = screen.getByText('brutalist web');
    expect(brutalistButton.className).toContain('bg-blue-500 text-white');

    // Other buttons should not have the selected class
    const synthwaveButton = screen.getByText('synthwave');
    expect(synthwaveButton.className).not.toContain('bg-blue-500 text-white');
  });
});
