import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock call-ai to capture options
let capturedOptions: any = null;
vi.mock('call-ai', () => ({
  callAI: async (_messages: any, options: any) => {
    capturedOptions = options;
    return 'ok';
  },
}));

import { streamAI } from '../app/utils/streamHandler';
let setRagHelper: (cfg: { use?: 'auto' | 'on' | 'off'; members?: Array<{ ref: string }> }) => void;

describe('streamAI RAG headers', () => {
  beforeAll(async () => {
    capturedOptions = null;
    // Ensure we use the real prompts module for the helper
    (vi as any).doUnmock?.('../app/prompts');
    vi.unmock('../app/prompts');
    vi.resetModules();
    const mod: any = await import('../app/prompts');
    setRagHelper = mod.__setActiveRetrievalConfigForTests;
  });

  it('attaches X-RAG-Refs header when retrieval.use=on and members provided', async () => {
    // Set retrieval config directly for this test
    setRagHelper({ use: 'on', members: [{ ref: 'crud-onboarding@1:demo-examples' }] });
    // Also set fallback via localStorage to ensure header present in this test env
    localStorage.setItem(
      'vibes-rag-refs',
      JSON.stringify([{ ref: 'crud-onboarding@1:demo-examples' }])
    );

    // Call streamAI (call-ai is mocked)
    const final = await streamAI('test-model', 'system', [], 'hello', () => {}, 'sk-test');

    expect(final).toBe('ok');
    expect(capturedOptions).toBeTruthy();
    const hdr = capturedOptions.headers['X-RAG-Refs'];
    expect(typeof hdr).toBe('string');
    const decoded = JSON.parse(decodeURIComponent(hdr));
    expect(Array.isArray(decoded)).toBe(true);
    expect(decoded[0].ref).toBe('crud-onboarding@1:demo-examples');
  });
});
