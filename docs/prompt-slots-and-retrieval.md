# Prompt slots and retrieval (Issue #184)

This repo now supports optional, catalog-driven guidance for CRUD onboarding and retrieval-only resources.

## Catalog item schema additions

A new guidance catalog item lives at `app/llms/crud-onboarding.json` with content in `app/llms/crud-onboarding.txt`.

Fields:

- `type`: `"guidance"` to mark it as non-importing guidance (excluded from module selection/imports)
- `version`: string, e.g. `"1"`
- `slots`: maps slot keys to tag names in the `.txt` file
  - `instructionalText` -> `instructional-guidance`
  - `demoDataGuidance` -> `demo-data-guidance`
- `ragResources`: array of retrieval-only resources (not concatenated into the prompt)

The text file wraps extractable sections with tags:

```
<instructional-guidance>…</instructional-guidance>
<demo-data-guidance>…</demo-data-guidance>
```

## App config schema

`UserSettings` supports optional prompt controls:

```
config.prompt.slots.instructionalText: {
  source: 'catalog' | 'inline' | 'off',
  catalogRef?: 'crud-onboarding@1',
  key?: 'instructionalText',
  text?: string,
  inclusion?: 'auto' | 'include' | 'exclude'
}

config.prompt.slots.demoDataGuidance: { …same shape… }

config.prompt.retrieval: {
  use?: 'auto' | 'on' | 'off',
  members?: Array<{ ref: string, includeInPrompt?: false }>
}
```

Defaults are conservative: both slots excluded unless explicitly included or decided by the tool; retrieval is off.

## Prompt assembly behavior

- The two hard-coded bullets for instructional text and Demo Data were removed from the base system prompt.
- When enabled, slot content is inserted into “System Prompt > Guidelines”.
- Retrieval members are not concatenated into prompt text. They are exposed to the backend via an `X-RAG-Refs` header.

## Decision tool

A new tool `decideCrudLookFeel` runs in parallel with module selection and returns:

```
{ appType, hasLookAndFeel, includeInstructionalText, includeDemoData, confidence }
```

Precedence:

1. Per-slot `source:"off"` or `inclusion:"exclude"` → exclude
2. Per-slot `inclusion:"include"` → include
3. `inclusion:"auto"` → follow tool output
4. On ambiguity/failure → exclude

## Notes

- Default `catalogRef` for catalog-based slots is `crud-onboarding@1`.
- Guidance catalog items are excluded from module selection and import generation.
- Tests cover off/include/auto modes, decision tool behavior in test mode, and retrieval-only handling.
