import { useState, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
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

    const savedMessage = document.createElement('div');
    savedMessage.className =
      'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg';
    savedMessage.textContent = 'Settings saved!';
    document.body.appendChild(savedMessage);

    setTimeout(() => {
      document.body.removeChild(savedMessage);
    }, 2000);
  }, [saveSettings, settings]);

  return (
    <SimpleAppLayout
      headerLeft={
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => (window.location.href = '/')}
            className="text-light-primary dark:text-dark-primary hover:text-accent-02-light dark:hover:text-accent-02-dark flex items-center px-3 py-2"
            aria-label="Go to home"
          >
            <HomeIcon className="h-6 w-6" />
          </button>
        </div>
      }
    >
      <div
        className="flex min-h-full flex-col items-center justify-start p-6"
        style={{ height: 'auto', minHeight: '100%', paddingBottom: '150px' }}
      >
        <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Application Settings</h2>
            <button
              onClick={handleSubmit}
              disabled={!hasUnsavedChanges}
              className={`rounded-md px-4 py-2 text-sm text-white transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${hasUnsavedChanges ? 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500' : 'cursor-not-allowed bg-gray-400 dark:bg-gray-600'}`}
            >
              Save Settings
            </button>
          </div>
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            Configure your application preferences to customize the AI experience.
          </p>
          <div className="space-y-6">
            <div className="rounded-md border border-gray-200 p-4 dark:border-gray-600">
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
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                Enter or select an AI model to use for code generation
              </p>

              <div className="mb-3">
                <input
                  ref={modelInputRef}
                  type="text"
                  value={settings.model || ''}
                  onChange={handleModelChange}
                  placeholder="Enter or select model ID..."
                  className="w-full rounded-md border border-gray-300 p-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div className="mb-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Suggested Models (click to select):
                </label>
                <div className="flex flex-wrap gap-2">
                  {modelsList.map((model, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleModelSelection(model)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        settings.model === model.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={model.description}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-4 dark:border-gray-600">
              <h3 className="mb-2 text-lg font-medium">Style Prompt</h3>
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                Choose a style for your AI-generated content
              </p>

              <div className="mb-3">
                <input
                  ref={stylePromptInputRef}
                  type="text"
                  value={settings.stylePrompt || ''}
                  onChange={handleStylePromptChange}
                  placeholder="Enter or select style prompt..."
                  className="w-full rounded-md border border-gray-300 p-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div className="mb-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Suggestions (click to add):
                </label>
                <div className="flex flex-wrap gap-2">
                  {stylePromptSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleStylePromptSelection(suggestion)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        settings.stylePrompt && settings.stylePrompt.startsWith(suggestion.name)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={suggestion.description}
                    >
                      {suggestion.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-4 dark:border-gray-600">
              <h3 className="mb-2 text-lg font-medium">User Prompt</h3>
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                Custom instructions to append to the system prompt
              </p>

              <div className="mb-2">
                <textarea
                  value={settings.userPrompt}
                  onChange={handleUserPromptChange}
                  placeholder="Enter custom instructions for the AI..."
                  className="min-h-[100px] w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SimpleAppLayout>
  );
}
