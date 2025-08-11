import { describe, it, expect, beforeAll, vi } from 'vitest';

// Use the real implementation from app/prompts
(vi as any).doUnmock?.('../app/prompts');
vi.unmock('../app/prompts');
vi.resetModules();

let makeBaseSystemPrompt: (model: string, sessionDoc?: any) => Promise<string>;
let preloadLlmsText: () => Promise<void>;

beforeAll(async () => {
  const mod = await import('../app/prompts');
  makeBaseSystemPrompt = mod.makeBaseSystemPrompt;
  preloadLlmsText = mod.preloadLlmsText;
  await preloadLlmsText();
});

describe('Prompt slots and retrieval config', () => {
  it('excludes instructional/demo guidance by default', async () => {
    const prompt = await makeBaseSystemPrompt('test-model', {});
    expect(prompt).not.toContain("vivid description of the app's purpose");
    expect(prompt).not.toContain('Demo Data button');
  });

  it('includes inline slot content when explicitly included', async () => {
    const prompt = await makeBaseSystemPrompt('test-model', {
      config: {
        prompt: {
          slots: {
            instructionalText: {
              source: 'inline',
              inclusion: 'include',
              text: 'Show a short getting-started paragraph in italics.',
            },
            demoDataGuidance: {
              source: 'inline',
              inclusion: 'include',
              text: 'Provide a Demo Data button that calls the same save function with an example.',
            },
          },
        },
      },
    });
    expect(prompt).toContain('Show a short getting-started paragraph in italics.');
    expect(prompt).toContain(
      'Provide a Demo Data button that calls the same save function with an example.'
    );
  });

  it('includes catalog slot content when explicitly included', async () => {
    const prompt = await makeBaseSystemPrompt('test-model', {
      config: {
        prompt: {
          slots: {
            instructionalText: {
              source: 'catalog',
              catalogRef: 'crud-onboarding@1',
              key: 'instructionalText',
              inclusion: 'include',
            },
            demoDataGuidance: {
              source: 'catalog',
              catalogRef: 'crud-onboarding@1',
              key: 'demoDataGuidance',
              inclusion: 'include',
            },
          },
        },
      },
    });
    expect(prompt).toContain("vivid description of the app's purpose");
    expect(prompt).toContain('\"Demo Data\" button that calls that same function');
  });

  it('auto mode excludes when stylePrompt present (custom look & feel)', async () => {
    const prompt = await makeBaseSystemPrompt('test-model', {
      stylePrompt: 'brand colors and bespoke layout',
      config: {
        prompt: {
          slots: {
            instructionalText: {
              source: 'catalog',
              catalogRef: 'crud-onboarding@1',
              key: 'instructionalText',
              inclusion: 'auto',
            },
            demoDataGuidance: {
              source: 'catalog',
              catalogRef: 'crud-onboarding@1',
              key: 'demoDataGuidance',
              inclusion: 'auto',
            },
          },
        },
      },
    });
    expect(prompt).not.toContain("vivid description of the app's purpose");
    expect(prompt).not.toContain('Demo Data button');
  });

  it('auto mode includes for obvious CRUD prompts without look & feel', async () => {
    const prompt = await makeBaseSystemPrompt('test-model', {
      userPrompt:
        'Build a CRUD for tasks: create, read, update, delete with a list and detail view',
      config: {
        prompt: {
          slots: {
            instructionalText: {
              source: 'catalog',
              catalogRef: 'crud-onboarding@1',
              key: 'instructionalText',
              inclusion: 'auto',
            },
            demoDataGuidance: {
              source: 'catalog',
              catalogRef: 'crud-onboarding@1',
              key: 'demoDataGuidance',
              inclusion: 'auto',
            },
          },
        },
      },
    });
    expect(prompt).toContain("vivid description of the app's purpose");
    expect(prompt).toContain('\"Demo Data\" button');
  });

  it('retrieval-only members do not appear in textual prompt', async () => {
    const prompt = await makeBaseSystemPrompt('test-model', {
      config: {
        prompt: {
          retrieval: {
            use: 'on',
            members: [{ ref: 'crud-onboarding@1:demo-examples', includeInPrompt: false }],
          },
        },
      },
    });
    expect(prompt).not.toContain('demo-examples');
    expect(prompt).not.toContain('crud-demo-examples.json');
  });
});
