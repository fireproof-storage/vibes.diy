# 45-Minute Implementation Sprint

## Priority Tasks

### 1. Finish Move to Iframe (15 minutes)

- Update `SandpackContent.tsx` to use a consistent iframe approach
- Ensure iframe is created once and persisted (in a simple way, new frame ok if code changes)
- Fix any iframe selector inconsistencies (standardize on generic 'iframe' selector)
- Remove commented-out code in ResultPreview.tsx

### 2. Fix Screenshots (20 minutes)

- Add html2canvas to the iframe template
- Implement screenshot capture function
- Update the message event handlers
- Wire up both the automatic and on-demand screenshot functionality
- Test screenshot capture

### 3. Move to Rapid Updates (10 minutes) - Optional

- Implement basic postMessage for App.jsx content updates
- Add minimal evaluation mechanism in iframe
- Make iframe render less often
- Test basic component swapping

## Implementation Details

### Iframe Template Updates

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Generated App</title>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      #container {
        width: 100%;
        height: 100vh;
      }
    </style>
    <script>
      // Screenshot functionality
      function captureScreenshot() {
        html2canvas(document.body).then((canvas) => {
          const dataURI = canvas.toDataURL();
          window.parent.postMessage({ type: 'screenshot', data: dataURI }, '*');
        });
      }

      function pageIsLoaded() {
        window.parent.postMessage({ type: 'preview-ready' }, '*');
        setTimeout(captureScreenshot, 100);
      }

      // For rapid updates (optional)
      let currentApp = null;
      function updateAppComponent(code) {
        try {
          // Evaluate new component code
          eval(code);

          // If we implement rapid updates, we'll need to re-render here
          if (currentApp && window.ReactDOM) {
            // Re-render with new component
          }

          return true;
        } catch (error) {
          console.error('Failed to update component:', error);
          return false;
        }
      }

      // Event listeners
      window.addEventListener('message', function (event) {
        if (event.data) {
          if (event.data.type === 'command') {
            if (event.data.command === 'capture-screenshot') {
              captureScreenshot();
            }
          } else if (event.data.type === 'update-component') {
            // For rapid updates (optional)
            updateAppComponent(event.data.code);
          } else if (event.data.type === 'callai-api-key' && event.data.key) {
            window.CALLAI_API_KEY = event.data.key;
          }
        }
      });

      window.addEventListener('DOMContentLoaded', function () {
        pageIsLoaded();
      });
    </script>
  </head>
  <body>
    <div id="container"></div>
  </body>
</html>
```

### SandpackContent.tsx Updates

1. Remove blob URL recreation on each update
2. Keep a stable iframe reference
3. For rapid updates, add:

```typescript
// Example rapid update code
function updateComponent(code: string) {
  if (iframeRef.current?.contentWindow) {
    iframeRef.current.contentWindow.postMessage(
      {
        type: 'update-component',
        code,
      },
      '*'
    );
  }
}
```

### ResultPreview.tsx Updates

1. Clean up commented code
2. Fix screenshot handling
3. Standardize iframe reference

## Testing Plan

1. Run the app locally and verify iframe loading
2. Test screenshot functionality
3. If implemented, test rapid component updates

## Next Steps After Sprint

1. Implement full dynamic import map
2. Add comprehensive testing
3. Complete the remaining technical debt items

## Verification Approach

Run `pnpm run smoke` at the end of the sprint to verify functionality hasn't regressed.
