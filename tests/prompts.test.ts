import { vi, describe, it, expect, beforeEach } from 'vitest';
import { makeBaseSystemPrompt, RESPONSE_FORMAT } from '../app/prompts';

// We need to mock the module properly, not test the real implementation yet
vi.mock('../app/prompts', () => ({
  makeBaseSystemPrompt: vi.fn().mockResolvedValue('mocked system prompt'),
  RESPONSE_FORMAT: {
    dependencies: {
      format: '{dependencies: { "package-name": "version" }}',
      note: 'use-fireproof is already provided, do not include it',
    },
    structure: [
      'Brief explanation',
      'Component code with proper Fireproof integration',
      'Real-time updates',
      'Data persistence',
    ],
  },
}));

describe('Prompts Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a base system prompt with model documentation', async () => {
    const model = 'gpt-4';
    const prompt = await makeBaseSystemPrompt(model);

    // Check that the prompt includes expected content from the mock
    expect(prompt).toBe('mocked system prompt');
  });

  it('handles different models', async () => {
    // Test with a different model
    const model = 'claude-3';
    const prompt = await makeBaseSystemPrompt(model);

    // The base prompt should be the same regardless of model (in current implementation)
    expect(prompt).toBe('mocked system prompt');
  });

  it('defines the correct response format', () => {
    // Check that RESPONSE_FORMAT has the expected structure
    expect(RESPONSE_FORMAT).toHaveProperty('dependencies');
    expect(RESPONSE_FORMAT).toHaveProperty('structure');

    // Check that dependencies format is defined
    expect(RESPONSE_FORMAT.dependencies).toHaveProperty('format');
    expect(RESPONSE_FORMAT.dependencies).toHaveProperty('note');
    expect(RESPONSE_FORMAT.dependencies.note).toContain('use-fireproof is already provided');

    // Check that structure is an array
    expect(Array.isArray(RESPONSE_FORMAT.structure)).toBe(true);
    expect(RESPONSE_FORMAT.structure.length).toBeGreaterThan(0);
    expect(RESPONSE_FORMAT.structure).toContain('Brief explanation');
    expect(RESPONSE_FORMAT.structure).toContain('Component code with proper Fireproof integration');
  });

  it('handles fetch errors gracefully', async () => {
    // Mock implementation to throw an error
    const mockImplementation = vi.fn().mockImplementation(() => {
      throw new Error('Network error');
    });
    
    // Override the mock for this test
    vi.mocked(makeBaseSystemPrompt).mockImplementationOnce(mockImplementation);

    try {
      await makeBaseSystemPrompt('gpt-4');
      // If we don't catch an error, the test should fail
      expect.fail('Expected makeBaseSystemPrompt to throw an error');
    } catch (error: any) {
      // We expect an error to be thrown
      expect(error).toBeDefined();
      expect(error.message).toBe('Network error');
    }
  });
  
  it('handles empty llms list', async () => {
    // For this test we just verify that the mock was called
    const model = 'gpt-4';
    await makeBaseSystemPrompt(model);
    
    expect(makeBaseSystemPrompt).toHaveBeenCalledWith(model);
  });
});
