# Incremental Refactor Plan: View State Management

**Goal**: Land the same "lift-`useViewState`/rename props" cleanup, but in bite-sized PRs that can be validated quickly.

## Guiding rules

1. Each PR should change **one logical concern** and keep the public API identical wherever possible.
2. After every step run `pnpm test && pnpm tsc --noEmit` plus a quick manual smoke on the main chat → preview path.
3. Deploy behind a short-lived feature flag only when behaviour might differ.

## Suggested order (low → high blast-radius)

| Step | Theme & scope                                                                                                                                                                                                                                                                                | Blast radius | How to verify                                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------ |
| 0    | **Create tech‐debt branch** → cherry-pick each tiny PR back to `main`.                                                                                                                                                                                                                       | –            | N/A                                                                |
| 1    | **Dead-code & import pruning** across `app/`. Remove unused hooks, commented code, stray `useEffect`.                                                                                                                                                                                        | 🔹 Very low  | Compile only; no runtime effect.                                   |
| 2    | **Type housekeeping** • Extract / rename `ViewType`, `ChatInterfaceProps`, etc. into `types/` without touching implementation files.                                                                                                                                                         | 🔹           | `tsc` only.                                                        |
| 3    | **Rename prop `setActiveView → navigateToView` but add a shim**<br>‑ In each _caller_ supply **both** props (`navigateToView={fn} setActiveView={fn}`)<br>‑ In each _callee_ keep the old name and accept both:<br>`ts<br>const navigate = props.navigateToView ?? props.setActiveView;<br>` | 🔸 Low       | Unit tests + quick click on ViewControls. No behaviour shifts yet. |
| 4    | **Memo compare update** — change the equality check in `MessageList` to use the new prop but still keep the old name so nothing breaks.                                                                                                                                                      | 🔸           | Run list-render tests, scroll performance.                         |
| 5    | **Centralise URL→view logic in new `useViewState` hook** **but don't lift it**. Introduce the hook inside `ResultPreviewHeaderContent` only. Under a flag, compare old vs new outputs.                                                                                                       | 🔸           | Unit snapshot of hook result; feature flag off by default.         |
| 6    | **Lift `useViewState` to `home.tsx`** (flagged). Export both `displayView` and _legacy_ `activeView` so children keep compiling.                                                                                                                                                             | 🔶 Medium    | Smoke test tab navigation; run full test suite.                    |
| 7    | **Delete legacy `activeView` plumbing** once step 6 proves stable. Remove prop from every component.                                                                                                                                                                                         | 🔶           | Search-replace guarantees compile errors where forgotten.          |
| 8    | **Simplify URL‐sync `useEffect`s** in `home.tsx` after legacy state is gone.                                                                                                                                                                                                                 | 🔶           | Manual deep-link checks (`/code`, `/data`, none).                  |
| 9    | **Clean up `ResultPreviewHeaderContent` props** (drop unused, reorder).                                                                                                                                                                                                                      | 🔶           | Verify header buttons, publish, share.                             |
| 10   | **Refactor `Message` / `StructuredMessage` to call `navigateToView`** and delete shims.                                                                                                                                                                                                      | 🔷 High      | End-to-end chat → code-link click path.                            |
| 11   | **Remove feature flag + kill shims** → final state.                                                                                                                                                                                                                                          | 🔷           | Full regression, deploy to staging.                                |

## Why this order?

- Steps 1-4 touch only TS types or no-op shims—safe and fast to review.
- Steps 5-7 introduce the new centralised state while ensuring backward compatibility.
- Later steps progressively delete the legacy code once the new path is proven.
- Manual checks get a bit heavier only after step 6 when real behaviour diverges.

## Practical tips

- Tag PR titles with `[Refactor-X/N]` so reviewers know the sequence.
- Add a release note for each PR: "no runtime change, TypeScript-only", "behind feature flag xyz", etc.
- Keep the flag default-off until step 8; flip it on in staging for a few days.
- Maintain a small checklist doc and tick items (URL sync, mobile preview, Back button, publish flow) after each PR.

Following this plan you'll merge ~10 small, low-stress diffs instead of one huge burst.

## Key behavior-impacting changes spotted in the refactor

1. View-state handling was **lifted from components to `home.tsx`**
   - `useViewState` now lives only in `home.tsx`; the local `activeView / setActiveView` state was removed from `home.tsx`, `ResultPreviewHeaderContent`, `ChatInterface`, `MessageList`, `Message`, etc.
   - All children now receive **`displayView` + `navigateToView`** instead of `activeView`/`setActiveView`.

2. URL navigation logic simplified
   - `home.tsx` no longer sets `activeView` directly on URL changes; it relies on `useViewState` to interpret the path.
   - Auto-redirect to `/app` only fires when no `/app|/code|/data` suffix exists.

3. **Header re-wiring** (`ResultPreviewHeaderContent`)
   - Removed internal `useEffect` that synced `activeView` ⇒ now trusts `displayView` prop.
   - `currentView` passed to `ViewControls` is now `displayView`.
   - Props trimmed / reordered; any forgotten prop in callers will alter publish / back button logic.

4. `MessageList` / `Message` / `StructuredMessage`
   - Replaced `setActiveView` prop with `navigateToView`.
   - Memo comparison now checks `navigateToView`, not `setActiveView`.

5. `ChatInterface`
   - Same prop swap; internals that once flipped tabs must be updated.

6. Type changes (`chat.ts`, `ResultPreviewTypes.ts`)
   - Added `ViewType` import in several files—ensure consistent enum/string usage.

7. Removed unused `useEffect`, imports, and cleaned boolean logic (`needsLogin === true`, etc.).

## From-Scratch Incremental Plan (behaviour-first)

This version assumes **no cherry-picks** from the large refactor. We start from `main` as it is **today** and layer small, easy-to-review diffs that each have a deterministic manual-test checklist.

### Phase A – Safety nets (no code changes)

| #   | Action                                                                                                                            | Why / How to verify                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| A-1 | Tag the current commit `pre-view-refactor` and push to origin.                                                                    | Roll-back anchor.                             |
| A-2 | Ensure CI runs `pnpm tsc`, `pnpm test`, lint & E2E smoke. Fail-fast gates are essential before edits.                             |
| A-3 | Add a lightweight Cypress script that deep-links to `/chat/<id>/<title>/code`, `/app`, `/data` and screenshots the loaded panels. | Provides visual diff detection between steps. |

### Phase B – Type & naming groundwork (very low blast-radius)

| Step | Scope                                                                                                                   | Behaviour change | Manual check         |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------- |
| B-1  | Introduce **`ViewType` enum** in `app/types/view.ts`. Replace string literals _only in type annotations_ (not runtime). | None             | `pnpm tsc` only      |
| B-2  | Extract common props into `ChatInterfaceProps`, `MessageListProps` interfaces (types only).                             | None             | Compile passes       |
| B-3  | Delete unused imports / commented `useEffect`s across repo.                                                             | None             | Unit tests & compile |

### Phase C – Introduce new API behind no-op shim

| Step                                                              | Scope                                                                                                                                                                                                                                | Behaviour change                   | Manual check                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------- | ---- | --------------------- |
| C-1                                                               | Add **`navigateToView(view)`** util in `utils/navigation.ts` that logs + delegates to `setActiveView` for now. Update **only `home.tsx`** to import and call it where it previously called `setActiveView`. Keep original calls too. | None (double-call)                 | Click ViewControls, ensure tab switches as before |
| C-2                                                               | Pass `navigateToView` **down the tree** but leave existing `setActiveView` untouched. Inside every consumer, default to one or the other:                                                                                            |
| `const changeView = props.navigateToView ?? props.setActiveView;` | None                                                                                                                                                                                                                                 | Run chat, ensure no console errors |
| C-3                                                               | Update memo equality checks to include both props (`navigateToView                                                                                                                                                                   |                                    | setActiveView`).                                  | None | Scroll perf unchanged |

### Phase D – Introduce **new `useViewState` hook** (not used yet)

| Step | Scope                                                                                                                                                    | Behaviour change | Manual check  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------- |
| D-1  | Implement hook in `utils/useViewState.ts` that derives `displayView`, `viewControls`, etc. It reads URL but **does not mutate history**. Add unit tests. | None             | `vitest` only |
| D-2  | Add a Storybook (or test component) showing the hook’s output for different paths via MemoryRouter.                                                      | None             | visual QA     |

### Phase E – Pilot hook in a leaf component

| Step | Scope                                                                                                                                                         | Behaviour change | Manual check                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------- |
| E-1  | In `ResultPreviewHeaderContent`, call the new hook **but keep using legacy props as source of truth**. Compare outputs via `console.debug` (behind dev flag). | None             | Header renders identical     |
| E-2  | Add toggle in dev toolbar (`?newView=1`) to switch the component to hook-driven props (`displayView` etc.) and visually verify.                               | Opt-in only      | Manual navigate through tabs |

### Phase F – Flip default to hook (medium blast-radius)

| Step | Scope                                                                                                                             | Behaviour change | Manual check                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------ |
| F-1  | Promote `useViewState` to `home.tsx`. Provide both **`displayView` & legacy `activeView`** to children.                           | None             | Deep-link / refresh tests      |
| F-2  | Gradually remove reads of `activeView` starting from the deepest child components, replacing with `displayView`. Commit per file. | Minor visual     | Click every tab per commit     |
| F-3  | Delete writes to `setActiveView` (top-down). At each commit, unit tests must pass.                                                | Real change      | Full regression + Cypress diff |

### Phase G – Remove shims & cleanup (high blast-radius)

| Step | Scope                                                                                | Behaviour change | Manual check                        |
| ---- | ------------------------------------------------------------------------------------ | ---------------- | ----------------------------------- |
| G-1  | Delete `setActiveView` prop entirely; update type defs.                              | Real change      | Compile fails if any forgotten spot |
| G-2  | Remove shim in `navigateToView` so it stops calling deleted function.                | Real change      | Chat & links                        |
| G-3  | Simplify URL sync `useEffect`s in `home.tsx` now that single source of truth exists. | Real change      | Deep-link, back-button, mobile flow |
| G-4  | Remove dev flag, dead debug logs, legacy Storybook entry.                            | None             | CI only                             |

### Phase H – Post-refactor regression sweep

1. Run full Cypress/E2E suite on desktop + mobile viewports.
2. Validate streaming flow, publish button, login banner, share modal.
3. Stage deploy behind temporary feature flag, dog-food for a day.

---

**Outcome:** Each merge delivers a working app with minimal surface area change, making behaviour verification straightforward before proceeding.
