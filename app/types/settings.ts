/**
 * User settings for the application
 */
export interface UserSettings {
  /** Document ID for the settings document */
  _id: string;

  /** Custom style prompt for UI generation */
  stylePrompt?: string;

  /** Custom user instructions to append to the system prompt */
  userPrompt?: string;

  /** AI model to use for code generation */
  model?: string;

  /**
   * Optional application configuration used by the prompt builder.
   * When absent, the prompt uses conservative defaults (excludes optional guidance).
   */
  config?: {
    prompt?: {
      /** Slot configuration for optional guidance blocks */
      slots?: {
        instructionalText?: PromptSlot;
        demoDataGuidance?: PromptSlot;
      };
      /** Retrieval configuration for RAG-only resources (never concatenated) */
      retrieval?: PromptRetrieval;
    };
  };
}

/** Source and inclusion controls for a prompt slot */
export interface PromptSlot {
  /** Where to get the slot content from */
  source: 'catalog' | 'inline' | 'off';
  /** Optional catalog item reference like "crud-onboarding@1" */
  catalogRef?: string;
  /** Optional key inside the catalog item, e.g. "instructionalText" */
  key?: string;
  /** Inline text when source === 'inline' */
  text?: string;
  /** Inclusion policy: auto (decision tool), include, exclude */
  inclusion?: 'auto' | 'include' | 'exclude';
}

/** Retrieval configuration for RAG-only members */
export interface PromptRetrieval {
  /** Toggle for retrieval usage */
  use?: 'auto' | 'on' | 'off';
  /** Members referencing catalog ragResources */
  members?: Array<{
    ref: string; // e.g. "crud-onboarding@1:demo-examples"
    includeInPrompt?: boolean; // must remain false for RAG-only
  }>;
}
