# Testing Policy

## Running Tests

### Full Test Suite

Always run the full test suite before pushing changes:

```bash
pnpm check
```

This command runs formatting, type checking, and all tests, ensuring your changes don't break existing functionality.

### Running Individual Tests

To run a specific test file:

```bash
pnpm test <test-name>
```

Examples:

- `pnpm test useViewState` - Run all tests in the useViewState.test.tsx file
- `pnpm test "should auto-navigate"` - Run tests with descriptions matching the pattern

### Testing Hooks

When testing hooks that use refs or state:

1. Be careful with renderHook usage - hooks maintain state between renders
2. For ref-based hooks, reset state between tests with unmount/remount pattern
3. Test actual state transitions, not just initial values

## Testing Guidelines

1. **Test Production Code**: Always test the actual implementation in src/, never test mocks or test-specific implementations.

2. **No Test-Specific Logic in Source**: Production code should never contain special cases or environment detection for tests.

3. **Use Proper Mocking**: Mock external dependencies rather than modifying source code for testability.

4. **Test Actual Behavior**: Tests should verify the actual behavior of code as it will run in production.

5. **Keep Tests Isolated**: Each test should be independent and not rely on state from other tests.

6. **Test Edge Cases**: Consider boundary conditions and error scenarios in your tests.

7. **Run pnpm check After Changes**: Always run the full suite after making changes to ensure nothing was broken.

## Commit Process

1. Make your changes
2. Write tests for new functionality
3. Run `pnpm check` to verify everything passes

These practices help maintain code quality and prevent regressions.
