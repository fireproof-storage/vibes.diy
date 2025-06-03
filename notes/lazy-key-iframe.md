# Iframe API Key Loading Approach

## Goal

Our goal was to simplify the API key management in the iframe preview system to avoid race conditions and make the code more maintainable. The previous implementation had several issues:

1. Using React hooks (useApiKey) across component boundaries caused synchronization problems
2. API key requests were being duplicated between the parent app and iframe
3. Error states and loading indicators were adding complexity to the UI
4. Tests were complicated by the need to mock the entire useApiKey hook structure

## Solution Approach

### Direct Key Injection

Rather than passing the API key through React props and component hierarchies, we now:

1. Directly inject the API key into the iframe HTML template at creation time
2. Use CALLAI_API_KEY from the environment config for development and testing
3. Fall back to localStorage for production environments

### Key Benefits

- **Simplified Architecture**: Removed multiple layers of indirection
- **Reduced Race Conditions**: No more async state sync issues between components
- **Better Testability**: Easier to mock a single environment variable than a complex hook
- **Improved Performance**: Eliminated redundant API requests
- **Cleaner Component Hierarchy**: ResultPreview and IframeContent components have clearer responsibilities

### Implementation Details

1. Modified IframeContent to use CALLAI_API_KEY directly when creating the iframe HTML
2. Removed apiKey prop from IframeContent interface
3. Updated ResultPreview to handle the simplified messaging between parent and iframe
4. Fixed tests to work with the new direct key injection approach
5. Updated useSimpleChat to handle the new return type from ensureApiKey

This approach maintains backward compatibility with existing code while providing a more robust solution for the iframe preview system.
