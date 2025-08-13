import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppSettingsView from '../app/components/ResultPreview/AppSettingsView';

describe('AppSettingsView Libraries (per‑vibe dependency chooser)', () => {
  beforeEach(() => vi.clearAllMocks());

  const baseProps = {
    title: 'My Vibe',
    onUpdateTitle: vi.fn(),
    onDownloadHtml: vi.fn(),
    instructionalTextOverride: undefined,
    demoDataOverride: undefined,
    onUpdateInstructionalTextOverride: vi.fn(),
    onUpdateDemoDataOverride: vi.fn(),
  };

  it('when not overridden, renders LLM-driven note and no preselection', async () => {
    const onUpdateDependencies = vi.fn();
    render(
      <AppSettingsView
        {...baseProps}
        onUpdateDependencies={onUpdateDependencies}
        selectedDependencies={undefined}
        dependenciesUserOverride={false}
      />
    );

    // Labels come from llms catalog JSON: useFireproof and callAI
    const fireproof = await screen.findByLabelText(/useFireproof/i, {
      selector: 'input[type="checkbox"]',
    });
    const callai = await screen.findByLabelText(/callAI/i, {
      selector: 'input[type="checkbox"]',
    });

    // No preselection in LLM-driven mode
    expect(fireproof).not.toBeChecked();
    expect(callai).not.toBeChecked();

    // LLM-driven banner is visible
    expect(
      screen.getByText(
        /Libraries, instructional text, and demo data are currently chosen by the LLM/i
      )
    ).toBeInTheDocument();
  });

  it('allows toggling and saves validated selection', async () => {
    const onUpdateDependencies = vi.fn().mockResolvedValue(undefined);
    render(
      <AppSettingsView
        {...baseProps}
        onUpdateDependencies={onUpdateDependencies}
        selectedDependencies={['fireproof', 'callai']}
        dependenciesUserOverride={true}
      />
    );

    const callai = await screen.findByLabelText(/callAI/i, {
      selector: 'input[type="checkbox"]',
    });

    await act(async () => fireEvent.click(callai)); // uncheck one

    const save = screen.getByRole('button', { name: /save/i });
    expect(save).not.toBeDisabled();

    await act(async () => fireEvent.click(save));
    expect(onUpdateDependencies).toHaveBeenCalledWith(['fireproof'], true);

    // After save, button should disable again briefly
    expect(save).toBeDisabled();
  });

  describe('Prompt Options', () => {
    it('renders instructional text and demo data controls with default LLM selection', async () => {
      const onUpdateInstructionalTextOverride = vi.fn();
      const onUpdateDemoDataOverride = vi.fn();

      render(
        <AppSettingsView
          {...baseProps}
          onUpdateDependencies={vi.fn()}
          onUpdateInstructionalTextOverride={onUpdateInstructionalTextOverride}
          onUpdateDemoDataOverride={onUpdateDemoDataOverride}
          instructionalTextOverride={undefined}
          demoDataOverride={undefined}
        />
      );

      // Check that Prompt Options section exists
      expect(screen.getByText('Prompt Options')).toBeInTheDocument();

      // Check instructional text controls
      expect(screen.getByText('Instructional Text')).toBeInTheDocument();
      const instructionalTextInputs = screen.getAllByDisplayValue('llm');
      const llmDecideInstructional = instructionalTextInputs.find(
        (input) => (input as HTMLInputElement).name === 'instructionalText'
      );
      const alwaysIncludeInstructional = screen.getByLabelText('Always include instructional text');
      const neverIncludeInstructional = screen.getByLabelText('Never include instructional text');

      // Default should be "Let LLM decide"
      expect(llmDecideInstructional!).toBeChecked();
      expect(alwaysIncludeInstructional).not.toBeChecked();
      expect(neverIncludeInstructional).not.toBeChecked();

      // Check demo data controls
      expect(screen.getByText('Demo Data')).toBeInTheDocument();
      const llmDecideDemo = instructionalTextInputs.find(
        (input) => (input as HTMLInputElement).name === 'demoData'
      );

      expect(llmDecideDemo!).toBeChecked();
    });

    it('allows changing instructional text override to always on', async () => {
      const onUpdateInstructionalTextOverride = vi.fn();

      render(
        <AppSettingsView
          {...baseProps}
          onUpdateDependencies={vi.fn()}
          onUpdateInstructionalTextOverride={onUpdateInstructionalTextOverride}
          onUpdateDemoDataOverride={vi.fn()}
          instructionalTextOverride={undefined}
          demoDataOverride={undefined}
        />
      );

      const alwaysIncludeInstructional = screen.getByLabelText('Always include instructional text');

      await act(async () => fireEvent.click(alwaysIncludeInstructional));

      expect(onUpdateInstructionalTextOverride).toHaveBeenCalledWith(true);
    });

    it('allows changing instructional text override to always off', async () => {
      const onUpdateInstructionalTextOverride = vi.fn();

      render(
        <AppSettingsView
          {...baseProps}
          onUpdateDependencies={vi.fn()}
          onUpdateInstructionalTextOverride={onUpdateInstructionalTextOverride}
          onUpdateDemoDataOverride={vi.fn()}
          instructionalTextOverride={undefined}
          demoDataOverride={undefined}
        />
      );

      const neverIncludeInstructional = screen.getByLabelText('Never include instructional text');

      await act(async () => fireEvent.click(neverIncludeInstructional));

      expect(onUpdateInstructionalTextOverride).toHaveBeenCalledWith(false);
    });

    it('allows changing back to LLM decision for instructional text', async () => {
      const onUpdateInstructionalTextOverride = vi.fn();

      render(
        <AppSettingsView
          {...baseProps}
          onUpdateDependencies={vi.fn()}
          onUpdateInstructionalTextOverride={onUpdateInstructionalTextOverride}
          onUpdateDemoDataOverride={vi.fn()}
          instructionalTextOverride={true}
          demoDataOverride={undefined}
        />
      );

      const instructionalTextInputs = screen.getAllByDisplayValue('llm');
      const llmDecideInstructional = instructionalTextInputs.find(
        (input) => (input as HTMLInputElement).name === 'instructionalText'
      );

      await act(async () => fireEvent.click(llmDecideInstructional!));

      expect(onUpdateInstructionalTextOverride).toHaveBeenCalledWith(undefined);
    });

    it('allows changing demo data override to always on', async () => {
      const onUpdateDemoDataOverride = vi.fn();

      render(
        <AppSettingsView
          {...baseProps}
          onUpdateDependencies={vi.fn()}
          onUpdateInstructionalTextOverride={vi.fn()}
          onUpdateDemoDataOverride={onUpdateDemoDataOverride}
          instructionalTextOverride={undefined}
          demoDataOverride={undefined}
        />
      );

      const alwaysIncludeDemo = screen.getByLabelText('Always include demo data');

      await act(async () => fireEvent.click(alwaysIncludeDemo));

      expect(onUpdateDemoDataOverride).toHaveBeenCalledWith(true);
    });

    it('allows changing demo data override to always off', async () => {
      const onUpdateDemoDataOverride = vi.fn();

      render(
        <AppSettingsView
          {...baseProps}
          onUpdateDependencies={vi.fn()}
          onUpdateInstructionalTextOverride={vi.fn()}
          onUpdateDemoDataOverride={onUpdateDemoDataOverride}
          instructionalTextOverride={undefined}
          demoDataOverride={undefined}
        />
      );

      const neverIncludeDemo = screen.getByLabelText('Never include demo data');

      await act(async () => fireEvent.click(neverIncludeDemo));

      expect(onUpdateDemoDataOverride).toHaveBeenCalledWith(false);
    });

    it('shows current override states correctly', async () => {
      render(
        <AppSettingsView
          {...baseProps}
          onUpdateDependencies={vi.fn()}
          onUpdateInstructionalTextOverride={vi.fn()}
          onUpdateDemoDataOverride={vi.fn()}
          instructionalTextOverride={true}
          demoDataOverride={false}
        />
      );

      // Instructional text should show "always on"
      const alwaysIncludeInstructional = screen.getByLabelText('Always include instructional text');
      expect(alwaysIncludeInstructional).toBeChecked();

      // Demo data should show "always off"
      const neverIncludeDemo = screen.getByLabelText('Never include demo data');
      expect(neverIncludeDemo).toBeChecked();
    });
  });
});
