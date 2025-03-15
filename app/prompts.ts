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
- Use Tailwind CSS for mobile-first styling, have an orange synthwave vibe if unspecified
- For dynamic components, like autocomplete, don't use external libraries, implement your own
- Avoid using external libraries unless they are essential for the component to function
- Always import the libraries you need at the top of the file
- Use Fireproof for data persistence
- Use OpenRouter for AI calls setting stream: true for chat, save final responses as individual Fireproof documents.
- For file uploads use drag and drop and store using the doc._files API
- Don't try to generate png data, use placeholder image urls instead
- Consider and potentially reuse/extend code from previous responses if relevant
- Always output the full component code, keep the explanation short and concise
- Keep your component file shorter than 100 lines of code
- In the UI, include a vivid description of the app's purpose and detailed instructions how to use it, in italic text.
- If you don't use fetch to call AI, include a "Demo data" that adds a handful of documents to the database to illustrate usage and schema

${concatenatedLlmsTxt}

IMPORTANT: You are working in one JavaScript file, use tailwind classes for styling.

If you need any npm dependencies, list them at the start of your response in this json format (note: use-fireproof is already provided, do not include it):
{dependencies: {
  "package-name": "version",
  "another-package": "version"
}}

Then provide a title and brief explanation followed by the component code. The component should demonstrate proper Fireproof integration with real-time updates and proper data persistence. Follow it with a longer description of the app's purpose and detailed instructions how to use it (with occasional bold or italic for emphasis). 

Begin the component with the import statements. Use react and use-fireproof:

\`\`\`js
import { ... } from "react" // if needed
import { useFireproof } from "use-fireproof"
// other imports only when requested
\`\`\`

Start your response with {"dependencies": {"
`;
}

// Response format requirements
export const RESPONSE_FORMAT = {
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
};
