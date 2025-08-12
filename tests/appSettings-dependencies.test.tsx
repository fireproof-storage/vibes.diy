import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppSettingsView from '../app/components/ResultPreview/AppSettingsView';

describe('AppSettingsView Libraries (per‑vibe dependency chooser)', () => {
  beforeEach(() => vi.clearAllMocks());

  const baseProps = {
    title: 'My Vibe',
    onUpdateTitle: vi.fn(),
    onDownloadHtml: vi.fn(),
  };

  it('renders catalog checkboxes with default selection when none provided', async () => {
    const onUpdateDependencies = vi.fn();
    render(
      <AppSettingsView
        {...baseProps}
        onUpdateDependencies={onUpdateDependencies}
        selectedDependencies={undefined}
      />
    );

    // Labels come from llms catalog JSON: useFireproof and callAI
    const fireproof = await screen.findByLabelText(/useFireproof/i, {
      selector: 'input[type="checkbox"]',
    });
    const callai = await screen.findByLabelText(/callAI/i, {
      selector: 'input[type="checkbox"]',
    });

    expect(fireproof).toBeChecked();
    expect(callai).toBeChecked();
  });

  it('allows toggling and saves validated selection', async () => {
    const onUpdateDependencies = vi.fn().mockResolvedValue(undefined);
    render(
      <AppSettingsView
        {...baseProps}
        onUpdateDependencies={onUpdateDependencies}
        selectedDependencies={['fireproof', 'callai']}
      />
    );

    const callai = await screen.findByLabelText(/callAI/i, {
      selector: 'input[type="checkbox"]',
    });

    await act(async () => fireEvent.click(callai)); // uncheck one

    const save = screen.getByRole('button', { name: /save/i });
    expect(save).not.toBeDisabled();

    await act(async () => fireEvent.click(save));
    expect(onUpdateDependencies).toHaveBeenCalledWith(['fireproof']);

    // After save, button should disable again briefly
    expect(save).toBeDisabled();
  });
});
