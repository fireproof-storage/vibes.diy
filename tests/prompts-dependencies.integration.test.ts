import { describe, it, expect, beforeAll, vi } from 'vitest';
// Ensure real implementation
(vi as any).doUnmock?.('../app/prompts');
vi.unmock('../app/prompts');
vi.resetModules();

let makeBaseSystemPrompt: (model: string, sessionDoc?: any) => Promise<string>;
let preloadLlmsText: () => Promise<void>;

beforeAll(async () => {
  const mod = await import('../app/prompts');
  makeBaseSystemPrompt = mod.makeBaseSystemPrompt;
  preloadLlmsText = mod.preloadLlmsText;
});

describe('makeBaseSystemPrompt dependency selection', () => {
  it('uses default dependencies when none provided', async () => {
    await preloadLlmsText();
    const prompt = await makeBaseSystemPrompt('anthropic/claude-sonnet-4', {
      _id: 'user_settings',
    });
    // Default includes fireproof and callai per catalog labels
    expect(prompt).toMatch(/<useFireproof-docs>/);
    expect(prompt).toMatch(/<callAI-docs>/);
    // Should include corresponding import lines
    expect(prompt).toMatch(/import\s+\{\s*useFireproof\s*\}\s+from\s+"use-fireproof"/);
    expect(prompt).toMatch(/import\s+\{\s*callAI\s*\}\s+from\s+"call-ai"/);
  });

  it('honors explicit dependencies from settings', async () => {
    await preloadLlmsText();
    const prompt = await makeBaseSystemPrompt('anthropic/claude-sonnet-4', {
      _id: 'user_settings',
      dependencies: ['fireproof'],
    });
    expect(prompt).toMatch(/<useFireproof-docs>/);
    expect(prompt).not.toMatch(/<callAI-docs>/);
    // Import statements reflect chosen modules only
    expect(prompt).toMatch(/import\s+\{\s*useFireproof\s*\}\s+from\s+"use-fireproof"/);
    expect(prompt).not.toMatch(/from\s+"call-ai"/);
  });
});
