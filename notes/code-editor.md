# Primer: Adding an **Explain-Selected-Text** Feature to the Monaco Code Editor

This document is a high-level orientation for contributors who want to let users **select a region of code and get an AI explanation** inside Vibes DIY. It links to the relevant files, describes the current editor set-up, and outlines an incremental path to implementation.

---

## 1. Where the Editor Is Initialised

| Concern                        | File                                                | Notes                                                                                                                             |
| ------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Monaco bootstrap & highlighter | `app/components/ResultPreview/setupMonacoEditor.ts` | Central place to adjust editor options, register languages and themes, and wire events. You can attach new command handlers here. |
| Editor mounting (React)        | `app/components/ResultPreview/IframeContent.tsx`    | Renders the `<MonacoEditor>` instance that eventually calls `setupMonacoEditor`.                                                  |
| Cross-component state          | `app/hooks/useMessageSelection.ts`                  | Already tracks which AI message or code block is selected. Could be extended to track arbitrary editor selections.                |

---

## 2. Capturing a User Selection

1. **Add a command or listener in `setupMonacoEditor.ts`:**

   ```ts
   editor.addAction({
     id: 'explain-selection',
     label: 'Explain Selected Code',
     keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE],
     contextMenuGroupId: 'navigation',
     run: () => onExplainSelection(editor),
   });
   ```

2. Export a callback `onExplainSelection` from a new util (e.g. `app/utils/explainSelection.ts`). Within it:

   ```ts
   const selection = editor.getModel()?.getValueInRange(editor.getSelection()!) || '';
   if (!selection.trim()) return;
   triggerExplanation(selection);
   ```

3. Debounce multiple rapid calls (Monaco fires on every caret move).

---

## 3. Talking to the AI Back-end

Our project already uses `call-ai` inside `app/hooks/useSimpleChat.ts` for regular chat completions. Re-use the same plumbing:

```ts
import { callAI, type Message } from 'call-ai';

export async function explainCode(snippet: string) {
  const sysPrompt = 'You are an expert engineer.  Explain the selected code in plain English.';
  const messages: Message[] = [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: snippet },
  ];
  return callAI({ model: CODING_MODEL, messages });
}
```

> 🔍 **Tip:** Use `anthropic/claude-sonnet-4` (the same model used for code generation) for consistency.

---

## 4. Surfacing the Explanation in the UI

There are two common patterns:

1. **Inline Hover:** Use Monaco’s `editor.setModelMarkers` + `hoverProvider` to show a tooltip. Good for short snippets.
2. **Chat Message:** Insert a system-style message into the existing chat (see `useSimpleChat.addSystemMessage`). Preserves history and works with Session saves.

For an MVP, injecting a chat message is easier and leverages existing rendering components.

```ts
chatState.addSystemMessage({
  type: 'system',
  text: explanationText,
  timestamp: Date.now(),
});
```

Remember that **all new routes must be registered in** `app/routes.ts` **if you expose a standalone page** (per project rule).

---

## 5. Testing & Linting Checklist

- **Unit tests** in `tests/` should target the helper that calls `call-ai` (mock the API, never hit real network).
- **UI tests** with `@testing-library/react` can simulate a selection and assert that `addSystemMessage` is called.
- Respect the JSX comma rule noted in our lint quirks memo: _no trailing comma after the last prop unless multiline trailing commas are consistent_.
- Run `pnpm check` before committing: this executes format, typecheck and tests.

---

## 6. Next Steps / Stretch Ideas

- Detect the programming language of the snippet (`monaco.editor.getModelLanguage`) and prepend it to the prompt.
- Provide Explain, Optimise, and Comment actions in the same command palette.
- Allow multi-cursor explanations (iterate over selections).

Happy hacking! Ping `@jchris` in chat if something here is unclear.
