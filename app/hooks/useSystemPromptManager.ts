import { useCallback } from 'react';
import { APP_MODE } from '../config/env';
import { makeBaseSystemPrompt } from '../prompts';
import type { UserSettings } from '../types/settings';
import type { VibeDocument } from '../types/chat';

// Model constant used for system prompts
const CODING_MODEL = 'anthropic/claude-sonnet-4';

/**
 * Hook for managing system prompts based on settings
 * @param settingsDoc - User settings document that may contain model preferences
 * @returns ensureSystemPrompt function that builds and returns a fresh system prompt
 */
export function useSystemPromptManager(
  settingsDoc: UserSettings | undefined,
  vibeDoc?: VibeDocument
) {
  // Stateless builder: always constructs and returns a fresh system prompt
  const ensureSystemPrompt = useCallback(
    async (overrides?: {
      userPrompt?: string;
      history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    }) => {
      if (APP_MODE === 'test') {
        return 'Test system prompt';
      }
      return makeBaseSystemPrompt(CODING_MODEL, {
        ...(settingsDoc || {}),
        ...(vibeDoc || {}),
        ...(overrides || {}),
      });
    },
    [settingsDoc, vibeDoc]
  );

  // Export only the builder function
  return ensureSystemPrompt;
}
