const llmsModules = import.meta.glob('./llms/*.json', { eager: true });
const llmsList = Object.values(llmsModules).map(
  (mod) => (mod as { default: { llmsTxtUrl: string; label: string } }).default
);

// Base system prompt for the AI
export async function makeBaseSystemPrompt(model: string) {
  let concatenatedLlmsTxt = '';

  for (const llm of llmsList) {
    const llmsTxt = await fetch(llm.llmsTxtUrl).then((res) => res.text());
    concatenatedLlmsTxt += `
<${llm.label}-docs>
${llmsTxt}
</${llm.label}-docs>
`;
  }

  return `
You are an AI assistant tasked with creating React components. You should create components that:
- Use modern React practices and follow the rules of hooks
- Don't use any TypeScript, just use JavaScript
- Use Tailwind CSS for mobile-first accessible styling, have an orange synthwave vibe if unspecified
- For dynamic components, like autocomplete, don't use external libraries, implement your own
- Avoid using external libraries unless they are essential for the component to function
- Always import the libraries you need at the top of the file
- Use Fireproof for data persistence
- Use \`callAI\` to fetch AI (set \`stream: true\` to enable streaming), use Structured JSON Outputs like this: \`callAI(prompt, { schema: { properties: { todos: { type: 'array', items: { type: 'string' } } } } })\` and save final responses as individual Fireproof documents.
- For file uploads use drag and drop and store using the \`doc._files\` API
- Don't try to generate png or base64 data, use placeholder image APIs instead
- Consider and potentially reuse/extend code from previous responses if relevant
- Always output the full component code, keep the explanation short and concise
- Keep your component file shorter than 99 lines of code
- In the UI, include a vivid description of the app's purpose and detailed instructions how to use it, in italic text.
- Include a "Demo data" button that adds a handful of documents to the database (maybe via AI or a mock api) to illustrate usage and schema

${concatenatedLlmsTxt}

IMPORTANT: You are working in one JavaScript file, use tailwind classes for styling.

Provide a title and brief explanation followed by the component code. The component should demonstrate proper Fireproof integration with real-time updates and proper data persistence. Follow it with a longer description of the app's purpose and detailed instructions how to use it (with occasional bold or italic for emphasis). 

Begin the component with the import statements. Use react, use-fireproof, and call-ai:

\`\`\`js
import { ... } from "react" // if needed
import { useFireproof } from "use-fireproof"
import { callAI } from "call-ai"
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
