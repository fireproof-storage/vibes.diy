# Hybrid Testing Approach: jsdom + Selective Chromium

## Overview

Based on the test results, we've implemented a **hybrid approach** that gets the best of both worlds:

- **jsdom (default)**: For the majority of tests that work well with mocking
- **Chromium (selective)**: For specific tests that benefit from real browser APIs

## Results

### jsdom Tests (Primary)

- **323 tests passing, 3 failed** (vs original 262 failed)
- Most component tests work perfectly with proper mocking
- Fast execution and reliable for established patterns

### Chromium Tests (Selected)

- **13 tests passing, 0 failed** in real browser
- Perfect for utility functions and simple components
- No mocking complexity, real browser behavior

## File Structure

```
vibes.diy/
├── vite.config.ts           # Main config with jsdom
├── vitest.chromium.config.ts # Chromium config for selected tests
├── tests/
│   ├── setup.ts            # Full jsdom setup with mocks
│   └── chromium-setup.ts   # Minimal setup for browser tests
```

## Test Categories

### ✅ jsdom Tests (Keep These)

- Component tests with React Router: `ChatInput`, `QuickSuggestions`
- Hook tests with complex mocking: `useSimpleChat/*`
- Integration tests: `SessionSidebar`, `ResultPreview`
- Tests requiring extensive browser API simulation

### 🌐 Chromium Tests (These)

- Pure utility functions: `vibeUtils.test.ts`, `encodeTitle.test.ts`
- Simple component rendering: `vibe-route.test.tsx`, `chatWithLegends.test.tsx`
- Configuration tests: `routes.test.ts`, `mock-check.test.ts`
- Tests that benefit from real DOM/browser APIs

## Commands

```bash
# Run all jsdom tests (default)
pnpm test

# Run specific test in jsdom
pnpm test ChatInput.test.tsx

# Run selected tests in Chromium
pnpm test:chromium

# Run all tests (future: could combine both)
pnpm test && pnpm test:chromium
```

## Migration Strategy

### Phase 1: Stabilize Current ✅

- jsdom tests working well (323/326 passing)
- Chromium tests working perfectly (13/13 passing)
- Both environments properly configured

### Phase 2: Gradual Migration (Future)

- Move tests to Chromium **only when they fail in jsdom**
- Focus on tests that need real browser APIs
- Keep complex mocked tests in jsdom for now

### Phase 3: Optimization (Long-term)

- Consider consolidating when Vitest browser support matures
- Evaluate performance vs reliability trade-offs

## Key Benefits

1. **Best of Both Worlds**
   - jsdom: Fast, reliable for most tests
   - Chromium: Real browser behavior when needed

2. **Incremental Approach**
   - No big-bang migration risk
   - Can move tests gradually
   - Fallback to jsdom if Chromium causes issues

3. **Minimal Disruption**
   - Existing tests keep working
   - New tests can choose environment
   - Clear separation of concerns

## Success Metrics

- **Overall improvement**: From 262 failed → 3 failed tests
- **Stability**: jsdom handles complex mocking well
- **Reliability**: Chromium provides real browser validation
- **Maintainability**: Clear separation between test types

This hybrid approach gives us the reliability of jsdom for complex tests while providing the real browser validation of Chromium for simpler tests that benefit from authentic DOM/browser APIs.
