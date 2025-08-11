import { callAI, type Message, type CallAIOptions } from 'call-ai';
import { APP_MODE, CALLAI_ENDPOINT } from './config/env';
// Import all LLM text files statically
import callaiTxt from './llms/callai.txt?raw';
import fireproofTxt from './llms/fireproof.txt?raw';
import imageGenTxt from './llms/image-gen.txt?raw';
import crudOnboardingTxt from './llms/crud-onboarding.txt?raw';
const llmsModules = import.meta.glob('./llms/*.json', { eager: true });
const llmsList = Object.values(llmsModules).map(
  (mod) =>
    (
      mod as {
        default: {
          name: string;
          label: string;
          llmsTxtUrl: string;
          module: string;
          importModule: string;
          importName: string;
          description?: string;
        };
      }
    ).default
);

// Static mapping of LLM text content
const llmsTextContent: Record<string, string> = {
  callai: callaiTxt,
  fireproof: fireproofTxt,
  'image-gen': imageGenTxt,
  'crud-onboarding': crudOnboardingTxt,
};

// Cache for LLM text documents to prevent redundant fetches/imports
const llmsTextCache: Record<string, string> = {};

// Load raw text for a single LLM by name using static imports
function loadLlmsTextByName(name: string): string | undefined {
  try {
    const text = llmsTextContent[name] || '';
    return text || undefined;
  } catch (_err) {
    console.warn('Failed to load raw LLM text for:', name, _err);
    return undefined;
  }
}

// Escape for RegExp construction
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Precompile import-detection regexes once per module entry
const llmImportRegexes = llmsList
  .filter((l) => l.importModule && l.importName)
  .map((l) => {
    const mod = escapeRegExp(l.importModule);
    const name = escapeRegExp(l.importName);
    return {
      name: l.name,
      // Matches: import { ..., <name>, ... } from '<module>'
      named: new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['\\\"]${mod}['\\\"]`),
      // Matches: import <name> from '<module>'
      def: new RegExp(`import\\s+${name}\\s+from\\s*['\\\"]${mod}['\\\"]`),
    } as const;
  });

type HistoryMessage = { role: 'user' | 'assistant' | 'system'; content: string };

// Active retrieval configuration for stream calls (RAG-only)
let activeRetrievalConfig: { use: 'auto' | 'on' | 'off'; members: Array<{ ref: string }> } = {
  use: 'off',
  members: [],
};

export function getActiveRetrievalConfig() {
  return activeRetrievalConfig;
}

function setActiveRetrievalConfig(cfg: {
  use?: 'auto' | 'on' | 'off';
  members?: Array<{ ref: string }>;
}) {
  activeRetrievalConfig = {
    use: cfg.use ?? 'off',
    members: Array.isArray(cfg.members) ? cfg.members : [],
  };
}

// Test-only helper
export function __setActiveRetrievalConfigForTests(cfg: {
  use?: 'auto' | 'on' | 'off';
  members?: Array<{ ref: string }>;
}) {
  setActiveRetrievalConfig(cfg);
}

// Detect modules already referenced in history imports
function detectModulesInHistory(history: HistoryMessage[]): Set<string> {
  const detected = new Set<string>();
  if (!Array.isArray(history)) return detected;
  for (const msg of history) {
    const content = msg?.content || '';
    if (!content || typeof content !== 'string') continue;
    for (const { name, named, def } of llmImportRegexes) {
      if (named.test(content) || def.test(content)) detected.add(name);
    }
  }
  return detected;
}

// Ask LLM which modules to include based on catalog + user prompt + history
async function selectLlmsModules(
  model: string,
  userPrompt: string,
  history: HistoryMessage[]
): Promise<string[]> {
  if (APP_MODE === 'test') return llmsList.map((l) => l.name);

  // Exclude guidance-only items from the selection catalog
  const selectable = llmsList.filter((l: any) => (l as any).type !== 'guidance');
  const catalog = selectable.map((l) => ({ name: l.name, description: l.description || '' }));
  const payload = { catalog, userPrompt: userPrompt || '', history: history || [] };

  const messages: Message[] = [
    {
      role: 'system',
      content:
        'You select which library modules from a catalog should be included. Read the JSON payload and return JSON with a single property "selected": an array of module identifiers using the catalog "name" values. Only choose from the catalog. Include any libraries already used in history. Respond with JSON only.',
    },
    { role: 'user', content: JSON.stringify(payload) },
  ];

  const options: CallAIOptions = {
    chatUrl: CALLAI_ENDPOINT,
    apiKey: 'sk-vibes-proxy-managed',
    model,
    schema: {
      name: 'module_selection',
      properties: { selected: { type: 'array', items: { type: 'string' } } },
    },
    max_tokens: 2000,
    headers: {
      'HTTP-Referer': 'https://vibes.diy',
      'X-Title': 'Vibes DIY',
      'X-VIBES-Token': localStorage.getItem('auth_token') || '',
    },
  };

  try {
    const raw = (await callAI(messages, options)) as string;
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed?.selected) ? parsed.selected : [];
    return arr.filter((v: unknown) => typeof v === 'string');
  } catch (err) {
    console.warn('Module selection call failed:', err);
    return [];
  }
}

// Public: preload all llms text files (triggered on form focus)
export async function preloadLlmsText(): Promise<void> {
  llmsList.forEach((llm) => {
    if (llmsTextCache[llm.name] || llmsTextCache[llm.llmsTxtUrl]) return;
    const text = loadLlmsTextByName(llm.name);
    if (text) {
      llmsTextCache[llm.name] = text;
      llmsTextCache[llm.llmsTxtUrl] = text;
    }
  });
}

// Decision tool: classify CRUD vs custom look & feel and inclusion booleans
async function decideCrudLookFeel(
  model: string,
  input: { userPrompt?: string; stylePrompt?: string; history?: HistoryMessage[] }
): Promise<{
  appType: 'crud' | 'custom' | 'mixed' | 'unknown';
  hasLookAndFeel: boolean;
  includeInstructionalText: boolean;
  includeDemoData: boolean;
  confidence: number;
}> {
  if (APP_MODE === 'test') {
    const hasStyle = !!(input.stylePrompt && input.stylePrompt.trim());
    const crudSignals = /\bcrud\b|create|update|delete|table|list|records?/i.test(
      input.userPrompt || ''
    );
    return {
      appType: crudSignals && !hasStyle ? 'crud' : hasStyle ? 'custom' : 'unknown',
      hasLookAndFeel: hasStyle,
      includeInstructionalText: crudSignals && !hasStyle,
      includeDemoData: crudSignals && !hasStyle,
      confidence: 0.9,
    };
  }

  const payload = {
    userPrompt: input.userPrompt || '',
    stylePrompt: input.stylePrompt || '',
    history: input.history || [],
  };

  const messages: Message[] = [
    {
      role: 'system',
      content:
        'Classify whether this app is a plain CRUD app without specified look & feel. Return JSON only with keys: appType (crud|custom|mixed|unknown), hasLookAndFeel (boolean), includeInstructionalText (boolean), includeDemoData (boolean), confidence (0..1). Include=true only when clearly CRUD with no specified look & feel.',
    },
    { role: 'user', content: JSON.stringify(payload) },
  ];

  const options: CallAIOptions = {
    chatUrl: CALLAI_ENDPOINT,
    apiKey: 'sk-vibes-proxy-managed',
    model,
    schema: {
      name: 'crud_lookfeel_decision',
      properties: {
        appType: { type: 'string' },
        hasLookAndFeel: { type: 'boolean' },
        includeInstructionalText: { type: 'boolean' },
        includeDemoData: { type: 'boolean' },
        confidence: { type: 'number' },
      },
    },
    max_tokens: 1000,
    headers: {
      'HTTP-Referer': 'https://vibes.diy',
      'X-Title': 'Vibes DIY',
      'X-VIBES-Token': localStorage.getItem('auth_token') || '',
    },
  };

  try {
    const raw = (await callAI(messages, options)) as string;
    const parsed = JSON.parse(raw);
    return {
      appType: (parsed?.appType as any) || 'unknown',
      hasLookAndFeel: Boolean(parsed?.hasLookAndFeel),
      includeInstructionalText: Boolean(parsed?.includeInstructionalText),
      includeDemoData: Boolean(parsed?.includeDemoData),
      confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : 0,
    };
  } catch (err) {
    console.warn('decideCrudLookFeel call failed:', err);
    return {
      appType: 'unknown',
      hasLookAndFeel: false,
      includeInstructionalText: false,
      includeDemoData: false,
      confidence: 0,
    };
  }
}

// Generate dynamic import statements from LLM configuration
export function generateImportStatements(llms: typeof llmsList) {
  const seen = new Set<string>();
  return llms
    .slice()
    .filter((l) => l.importModule && l.importName)
    .sort((a, b) => a.importModule.localeCompare(b.importModule))
    .filter((l) => {
      const key = `${l.importModule}:${l.importName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((l) => `\nimport { ${l.importName} } from "${l.importModule}"`)
    .join('');
}

// Base system prompt for the AI
export async function makeBaseSystemPrompt(model: string, sessionDoc?: any) {
  // Inputs for module selection
  const userPrompt = sessionDoc?.userPrompt || '';
  const history: HistoryMessage[] = Array.isArray(sessionDoc?.history) ? sessionDoc.history : [];
  const stylePromptInput = sessionDoc?.stylePrompt;
  // 1) Ask AI which modules to include and run decision tool in parallel
  const [aiSelected, decision] = await Promise.all([
    selectLlmsModules(model, userPrompt, history),
    decideCrudLookFeel(model, { userPrompt, stylePrompt: stylePromptInput, history }),
  ]);

  // 2) Ensure we retain any modules already used in history
  const detected = detectModulesInHistory(history);
  const finalNames = new Set<string>([...aiSelected, ...detected]);
  const chosenLlms = llmsList
    .filter((l: any) => (l as any).type !== 'guidance')
    .filter((l) => finalNames.has(l.name));

  // 3) Concatenate docs for chosen modules
  let concatenatedLlmsTxt = '';
  for (const llm of chosenLlms) {
    // Prefer cached content (preloaded on focus). If missing, try static import as a fallback.
    let text = llmsTextCache[llm.name] || llmsTextCache[llm.llmsTxtUrl];
    if (!text) {
      text = loadLlmsTextByName(llm.name) || '';
      if (text) {
        llmsTextCache[llm.name] = text;
        llmsTextCache[llm.llmsTxtUrl] = text;
      }
    }

    concatenatedLlmsTxt += `
<${llm.label}-docs>
${text || ''}
</${llm.label}-docs>
`;
  }

  const defaultStylePrompt = `Create a UI theme inspired by the Memphis Group and Studio Alchimia from the 1980s. Incorporate bold, playful geometric shapes (squiggles, triangles, circles), vibrant primary colors (red, blue, yellow) with contrasting pastels (pink, mint, lavender), and asymmetrical layouts. Use quirky patterns like polka dots, zigzags, and terrazzo textures. Ensure a retro-futuristic vibe with a mix of matte and glossy finishes, evoking a whimsical yet functional design. Secretly name the theme 'Memphis Alchemy' to reflect its roots in Ettore Sotsass’s vision and global 1980s influences. Make sure the app background has some kind of charming patterned background using memphis styled dots or squiggly lines. Use thick "neo-brutalism" style borders for style to enhance legibility. Make sure to retain high contrast in your use of colors. Light background are better than dark ones. Use these colors: #70d6ff #ff70a6 #ff9770 #ffd670 #e9ff70 #242424 #ffffff Never use white text.`;

  // Get style prompt from session document if available
  const stylePrompt = stylePromptInput || defaultStylePrompt;

  // Resolve optional guidance slots and retrieval-only resources
  type SlotConfig =
    | { source: 'off' | undefined; inclusion?: 'auto' | 'include' | 'exclude' }
    | { source: 'inline'; text?: string; inclusion?: 'auto' | 'include' | 'exclude' }
    | {
        source: 'catalog';
        catalogRef?: string;
        key?: string;
        inclusion?: 'auto' | 'include' | 'exclude';
      };

  const slots = sessionDoc?.config?.prompt?.slots || {};
  const retrieval = sessionDoc?.config?.prompt?.retrieval || {};
  const DEFAULT_CATALOG_REF = 'crud-onboarding@1';

  function shouldInclude(slot: SlotConfig | undefined, autoValue: boolean): boolean {
    if (!slot || (slot as any).source === undefined || (slot as any).source === 'off') return false;
    const incl = (slot as any).inclusion || 'auto';
    if (incl === 'exclude') return false;
    if (incl === 'include') return true;
    return !!autoValue;
  }

  function extractTaggedSection(txt: string, tag: string): string | undefined {
    const re = new RegExp(`<${tag}>\\n([\\s\\S]*?)\\n<\\/${tag}>`);
    const m = txt.match(re);
    return m ? m[1].trim() : undefined;
  }

  function resolveCatalogSlot(refOrUndefined: string | undefined, key: string | undefined) {
    const ref = refOrUndefined || DEFAULT_CATALOG_REF; // name@version
    const [name] = ref.split('@');
    const text = llmsTextCache[name] || llmsTextContent[name];
    if (!text) return undefined;
    let tag = '';
    if (name === 'crud-onboarding') {
      tag = key === 'demoDataGuidance' ? 'demo-data-guidance' : 'instructional-guidance';
    } else {
      tag = key || '';
    }
    if (!tag) return undefined;
    return extractTaggedSection(text, tag);
  }

  const autoInstruction = !!decision?.includeInstructionalText;
  const autoDemo = !!decision?.includeDemoData;
  const resolvedGuidelines: string[] = [];

  const sInstruction: SlotConfig | undefined = (slots as any).instructionalText;
  if (shouldInclude(sInstruction, autoInstruction)) {
    let block: string | undefined;
    if (sInstruction?.source === 'inline') block = (sInstruction as any).text || '';
    else if (sInstruction?.source === 'catalog')
      block = resolveCatalogSlot(
        (sInstruction as any).catalogRef,
        (sInstruction as any).key || 'instructionalText'
      );
    if (block && block.trim()) resolvedGuidelines.push(`- ${block.trim()}`);
  }

  const sDemo: SlotConfig | undefined = (slots as any).demoDataGuidance;
  if (shouldInclude(sDemo, autoDemo)) {
    let block: string | undefined;
    if (sDemo?.source === 'inline') block = (sDemo as any).text || '';
    else if (sDemo?.source === 'catalog')
      block = resolveCatalogSlot(
        (sDemo as any).catalogRef,
        (sDemo as any).key || 'demoDataGuidance'
      );
    if (block && block.trim()) {
      const lines = block
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
      for (const line of lines) resolvedGuidelines.push(`- ${line}`);
    }
  }

  // RAG-only retrieval config (not concatenated into text)
  const retrievalUse = retrieval?.use || 'off';
  const retrievalMembers = Array.isArray(retrieval?.members) ? retrieval.members : [];
  setActiveRetrievalConfig({
    use: retrievalUse === 'auto' ? (autoDemo ? 'on' : 'off') : retrievalUse,
    members: retrievalMembers
      .map((m: any) => ({ ref: (m as any).ref }))
      .filter((m: { ref?: string }) => !!m.ref),
  });

  return `
You are an AI assistant tasked with creating React components. You should create components that:
- Use modern React practices and follow the rules of hooks
- Don't use any TypeScript, just use JavaScript
- Use Tailwind CSS for mobile-first accessible styling
- Don't use words from the style prompt in your copy: ${stylePrompt}
- For dynamic components, like autocomplete, don't use external libraries, implement your own
- Avoid using external libraries unless they are essential for the component to function
- Always import the libraries you need at the top of the file
- Use Fireproof for data persistence
- Use \`callAI\` to fetch AI (set \`stream: true\` to enable streaming), use Structured JSON Outputs like this: \`callAI(prompt, { schema: { properties: { todos: { type: 'array', items: { type: 'string' } } } } })\` and save final responses as individual Fireproof documents.
- For file uploads use drag and drop and store using the \`doc._files\` API
- Don't try to generate png or base64 data, use placeholder image APIs instead, like https://picsum.photos/400 where 400 is the square size
- Consider and potentially reuse/extend code from previous responses if relevant
- Always output the full component code, keep the explanation short and concise
- Never also output a small snippet to change, just the full component code
- Keep your component file as short as possible for fast updates
- Keep the database name stable as you edit the code
- The system can send you crash reports, fix them by simplifying the affected code
- If you get missing block errors, change the database name to a new name
- List data items on the main page of your app so users don't have to hunt for them
- If you save data, make sure it is browseable in the app, eg lists should be clickable for more details
${resolvedGuidelines.join('\n')}

${concatenatedLlmsTxt}

## ImgGen Component

You should use this component in all cases where you need to generate or edit images. It is a React component that provides a UI for image generation and editing. Make sure to pass the database prop to the component. If you generate images, use a live query to list them (with type 'image') in the UI. The best usage is to save a document with a string field called \`prompt\` (which is sent to the generator) and an optional \`doc._files.original\` image and pass the \`doc._id\` to the component via the  \`_id\` prop. It will handle the rest.

${
  userPrompt
    ? `${userPrompt}

`
    : ''
}IMPORTANT: You are working in one JavaScript file, use tailwind classes for styling. Remember to use brackets like bg-[#242424] for custom colors.

Provide a title and brief explanation followed by the component code. The component should demonstrate proper Fireproof integration with real-time updates and proper data persistence. Follow it with a short description of the app's purpose and instructions how to use it (with occasional bold or italic for emphasis). Then suggest some additional features that could be added to the app.

Begin the component with the import statements. Use react and the following libraries:

\`\`\`js
import React, { ... } from "react"${generateImportStatements(chosenLlms)}

// other imports only when requested
\`\`\`

`;
}

// Response format requirements
export const RESPONSE_FORMAT = {
  structure: [
    'Brief explanation',
    'Component code with proper Fireproof integration',
    'Real-time updates',
    'Data persistence',
  ],
};
