# Chromium Migration Cleanup Plan

## Current State Analysis

The codebase is in a **transition state** between heavy jsdom mocking and real browser testing. Commit `7f2f581` removed significant mocking but didn't complete the Chromium switch, leaving tests in a broken middle ground.

## Option 2 Work That Aligns with Option 1

### ✅ Already Done (Keep These)
1. **Reduced mock surface area** - Many mocks were removed in 7f2f581
2. **Real component rendering** - Tests are trying to render actual components
3. **Authentic user interactions** - Tests use real event handlers
4. **Environment variable cleanup** - Less reliance on mock environments

### 🔄 Cleanup Items That Prepare for Chromium

#### 1. Remove Remaining Heavy Mocks in `setup.ts`
```typescript
// REMOVE these jsdom-specific mocks (lines 28-112):
- React Router mocking (lines 28-62)
- window.matchMedia mock (lines 74-86) 
- navigator.clipboard mock (lines 89-93)
- TextEncoder polyfill (lines 96-112)
```

#### 2. Fix Auth Test Pattern
The auth test failure shows the **exact problem** - module mocking vs real imports:
```typescript
// BAD (current): Mock entire config module before import
vi.mock('../app/config/env', () => ({ ... }))

// GOOD (Chromium-ready): Use real environment variables
process.env.VITE_CLOUD_SESSION_TOKEN_PUBLIC = 'zValidBase58String'
```

#### 3. Convert Component Tests to Real DOM
```typescript
// BAD: Mock document/window APIs
Object.defineProperty(window, 'matchMedia', { ... })

// GOOD: Let real Chromium provide these APIs
// (just remove the mocks)
```

#### 4. Eliminate Import-Time Mocking
```typescript
// BAD: vi.mock() at module level
vi.mock('react-router', () => ({ ... }))

// GOOD: Real imports with test data
import { MemoryRouter } from 'react-router'
```

## Migration Steps (Ordered by Impact)

### Phase 1: Environment Setup
1. **Update vite.config.ts**:
   ```typescript
   test: {
     environment: '@vitest/browser',
     browser: {
       enabled: true,
       name: 'chromium',
       provider: 'playwright'
     }
   }
   ```

2. **Install dependencies**:
   ```bash
   pnpm add -D @vitest/browser playwright
   ```

### Phase 2: Remove Problematic Mocks
1. **Clean up `setup.ts`** - Remove lines 28-112 (React Router, DOM API mocks)
2. **Fix auth tests** - Use real env vars instead of module mocks
3. **Remove `__mocks__` directory** - Let real modules load

### Phase 3: Test-by-Test Conversion
Focus on these patterns that are **Chromium-ready**:

#### ✅ Keep These Test Patterns:
```typescript
// Real component rendering
render(<ChatInput chatState={mockChatState} onSend={onSend} />)

// Real user interactions  
fireEvent.click(sendButton)

// Real DOM queries
screen.getByLabelText('Send message')
```

#### 🔧 Convert These Patterns:
```typescript
// FROM: Mock implementations
vi.mock('../app/hooks/useApiKey', () => ({ ... }))

// TO: Real hooks with test data
<TestProvider apiKey="test-key">
  <Component />
</TestProvider>
```

## Key Insight: Most Work is **Removal**

The biggest cleanup for Chromium is **removing code**, not adding it:
- Remove mock implementations
- Remove environment polyfills  
- Remove module interception
- Remove DOM API simulation

## Tests That Are Already Chromium-Ready

These test files need **minimal changes**:
- `vibeUtils.test.ts` - Pure utility functions
- `encodeTitle.test.ts` - String manipulation
- `routes.test.ts` - Route configuration
- `mock-check.test.ts` - Meta test

## Risk Assessment

**Low Risk** (just remove mocks):
- Component rendering tests
- User interaction tests
- DOM query tests

**Medium Risk** (need real services):
- API key management tests
- Authentication flow tests
- Database integration tests

**High Risk** (need redesign):
- Tests that mock entire modules
- Tests that depend on import-time mocking
- Tests that simulate browser APIs

## Success Metrics

1. **Zero vi.mock() calls** in test files
2. **Real browser APIs** working in tests
3. **Faster test execution** (no jsdom overhead)
4. **More reliable tests** (real browser behavior)
5. **Simpler test setup** (fewer moving parts)

## Timeline Estimate

- **Phase 1**: 1 day (config + deps)
- **Phase 2**: 2 days (remove mocks)  
- **Phase 3**: 3-5 days (convert tests)

**Total**: ~1 week for complete Chromium migration

The key insight: **Option 2 cleanup work is 80% of Option 1 work**, but Option 1 gives you a much better end state. Better to go all the way.