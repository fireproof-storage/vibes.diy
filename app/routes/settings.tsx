import { useState, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleAppLayout from '../components/SimpleAppLayout';
import { HomeIcon } from '../components/SessionSidebar/HomeIcon';
import { useSession } from '../hooks/useSession';
import { useFireproof } from 'use-fireproof';
import type { UserSettings } from '../types/settings';
import modelsList from '../data/models.json';

export function meta() {
  return [
    { title: 'Settings - Vibes DIY' },
    { name: 'description', content: 'Settings for AI App Builder' },
  ];
}

export default function Settings() {
  const navigate = useNavigate();
  const { mainDatabase } = useSession();
  const { useDocument } = useFireproof(mainDatabase.name);

  const {
    doc: settings,
    merge: mergeSettings,
    save: saveSettings,
  } = useDocument<UserSettings>({
    _id: 'user_settings',
    stylePrompt: '',
    userPrompt: '',
    model: '',
  });

  // State to track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const stylePromptSuggestions = [
    { name: 'synthwave', description: '80s digital aesthetic' },
    { name: 'brutalist web', description: 'raw, grid-heavy' },
    { name: 'organic UI', description: 'natural, fluid forms' },
    { name: 'maximalist', description: 'dense, decorative' },
    { name: 'skeuomorphic', description: 'real-world mimics' },
    { name: 'flat design', description: 'clean, 2D shapes' },
    { name: 'bauhaus', description: 'geometric modernism' },
    { name: 'glitchcore', description: 'decentering expectations' },
    { name: 'paper cutout', description: 'layered, tactile' },
  ];

  const stylePromptInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const handleStylePromptChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      mergeSettings({ stylePrompt: e.target.value });
      setHasUnsavedChanges(true); // Track change
    },
    [mergeSettings]
  );

  const handleStylePromptSelection = useCallback(
    (suggestion: { name: string; description: string }) => {
      const fullPrompt = `${suggestion.name} (${suggestion.description})`;
      mergeSettings({ stylePrompt: fullPrompt });
      setHasUnsavedChanges(true); // Track change

      setTimeout(() => {
        if (stylePromptInputRef.current) {
          stylePromptInputRef.current.focus();
          const length = stylePromptInputRef.current.value.length;
          stylePromptInputRef.current.setSelectionRange(length, length);
        }
      }, 50);
    },
    [mergeSettings]
  );

  const handleModelChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      mergeSettings({ model: e.target.value });
      setHasUnsavedChanges(true); // Track change
    },
    [mergeSettings]
  );

  const handleModelSelection = useCallback(
    (model: { id: string; name: string; description: string }) => {
      mergeSettings({ model: model.id });
      setHasUnsavedChanges(true); // Track change

      setTimeout(() => {
        if (modelInputRef.current) {
          modelInputRef.current.focus();
          const length = modelInputRef.current.value.length;
          modelInputRef.current.setSelectionRange(length, length);
        }
      }, 50);
    },
    [mergeSettings]
  );

  const handleUserPromptChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      mergeSettings({ userPrompt: e.target.value });
      setHasUnsavedChanges(true); // Track change
    },
    [mergeSettings]
  );

  const handleSubmit = useCallback(async () => {
    await saveSettings(settings);
    setHasUnsavedChanges(false); // Reset after save
    // navigate to /
    navigate('/');
  }, [saveSettings, settings, navigate]);

  return (
    <SimpleAppLayout
      headerLeft={
        <div className="flex items-center">
          <a
            href="/"
            className="text-light-primary dark:text-dark-primary hover:text-accent-02-light dark:hover:text-accent-02-dark flex items-center px-3 py-2"
            aria-label="Go to home"
          >
            <HomeIcon className="h-6 w-6" />
          </a>
        </div>
      }
    >
      <div
        className="flex min-h-full flex-col items-center justify-start p-6"
        style={{ height: 'auto', minHeight: '100%', paddingBottom: '150px' }}
      >
        <div className="border-light-decorative-01 dark:border-dark-decorative-00 dark:bg-dark-background-01 w-full max-w-2xl rounded-md border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">User Preferences</h2>
            <button
              onClick={handleSubmit}
              disabled={!hasUnsavedChanges}
              className={`rounded px-4 py-2 text-sm text-white transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${hasUnsavedChanges ? 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500' : 'accent-01 dark:bg-dark-decorative-01 cursor-not-allowed'}`}
            >
              Save
            </button>
          </div>
          <p className="text-accent-01 dark:text-dark-secondary mb-4">
            Configure your application settings to customize the AI experience.
          </p>
          <div className="space-y-6">
            <div className="border-light-decorative-01 dark:border-dark-decorative-01 rounded border p-4">
              <div className="flex items-start justify-between">
                <h3 className="mb-2 text-lg font-medium">AI Model</h3>
                <a
                  href="https://openrouter.ai/models"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Browse all models ↗
                </a>
              </div>
              <p className="text-accent-01 dark:text-accent-01 mb-3 text-sm">
                Enter or select an AI model to use for code generation
              </p>

              <div className="mb-3">
                <input
                  ref={modelInputRef}
                  type="text"
                  value={settings.model || ''}
                  onChange={handleModelChange}
                  placeholder="Enter or select model ID..."
                  className="border-light-decorative-01 dark:border-dark-decorative-01 dark:bg-dark-decorative-00 dark:text-dark-primary w-full rounded border p-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="mb-2">
                <label className="text-light-secondary dark:text-dark-secondary mb-1 block text-sm font-medium">
                  Recommended models (click to select):
                </label>
                <div className="flex flex-wrap gap-2">
                  {modelsList.map((model, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleModelSelection(model)}
                      className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        settings.model === model.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-light-background-01 text-light-primary hover:bg-light-background-02 dark:bg-dark-decorative-00 dark:text-dark-secondary dark:hover:bg-dark-decorative-01'
                      }`}
                      title={model.description}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-light-decorative-01 dark:border-dark-decorative-01 rounded border p-4">
              <h3 className="mb-2 text-lg font-medium">Style Prompt</h3>
              <p className="text-accent-01 dark:text-accent-01 mb-3 text-sm">
                Choose a style for your AI-generated content
              </p>

              <div className="mb-3">
                <input
                  ref={stylePromptInputRef}
                  type="text"
                  value={settings.stylePrompt || ''}
                  onChange={handleStylePromptChange}
                  placeholder="Enter or select style prompt..."
                  className="border-light-decorative-01 dark:border-dark-decorative-01 dark:bg-dark-decorative-00 dark:text-dark-primary w-full rounded border p-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="mb-2">
                <label className="text-light-secondary dark:text-dark-secondary mb-1 block text-sm font-medium">
                  Suggestions (click to add):
                </label>
                <div className="flex flex-wrap gap-2">
                  {stylePromptSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleStylePromptSelection(suggestion)}
                      className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        settings.stylePrompt && settings.stylePrompt.startsWith(suggestion.name)
                          ? 'bg-blue-500 text-white'
                          : 'bg-light-background-01 text-light-primary hover:bg-light-background-02 dark:bg-dark-decorative-00 dark:text-dark-secondary dark:hover:bg-dark-decorative-01'
                      }`}
                      title={suggestion.description}
                    >
                      {suggestion.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-light-decorative-01 dark:border-dark-decorative-01 rounded border p-4">
              <h3 className="mb-2 text-lg font-medium">User Prompt</h3>
              <p className="text-accent-01 dark:text-accent-01 mb-3 text-sm">
                Custom instructions to append to the system prompt
              </p>

              <div className="mb-2">
                <textarea
                  value={settings.userPrompt}
                  onChange={handleUserPromptChange}
                  placeholder="Enter custom instructions for the AI..."
                  className="border-light-decorative-01 dark:border-dark-decorative-01 dark:bg-dark-decorative-00 dark:text-dark-primary min-h-[100px] w-full rounded border p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SimpleAppLayout>
  );
}
