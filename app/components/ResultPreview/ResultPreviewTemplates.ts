export const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script>
      // Global variable to store the API key
      window.API_KEY = null;
      
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              'light-primary': '#2C2C2C',
              'light-secondary': '#2C2C2C',
              'light-decorative-00': '#EBEAEA',
              'light-decorative-01': '#E0DEDE',
              'light-decorative-02': '#2C2C2C',
              'light-background-00': '#FFFFFF',
              'light-background-01': '#F5F5F5',
              'light-background-02': '#F0F0F0',
              'dark-primary': '#FFFFFF',
              'dark-secondary': '#FFFFFF',
              'dark-decorative-00': '#302F30',
              'dark-decorative-01': '#414141',
              'dark-decorative-02': '#FFFFFF',
              'dark-background-00': '#171616',
              'dark-background-01': '#201F20',
              'dark-background-02': '#201F20',
              'accent-00-light': '#F9A100',
              'accent-01-light': '#F58709',
              'accent-02-light': '#F16C12',
              'accent-03-light': '#EE521C',
              'accent-00-dark': '#FFAA0F',
              'accent-01-dark': '#FF8F0F',
              'accent-02-dark': '#FF7119',
              'accent-03-dark': '#FF612A',
            }
          }
        }
      }

      function captureScreenshot() {
        html2canvas(document.body).then(canvas => {
          const dataURI = canvas.toDataURL();
          window.parent.postMessage({ type: 'screenshot', data: dataURI }, '*');
        });
      }

      function pageIsLoaded() {
        window.parent.postMessage({ type: 'preview-loaded' }, '*');
        setTimeout(captureScreenshot, 100);
      }

      window.addEventListener('message', function(event) {        
        if (event.data && event.data.type === 'command' && event.data.command === 'reload-preview') {
          window.location.reload();
        }
        // Handle API key message
        if (event.data && event.data.type === 'openrouter-api-key' && event.data.key) {
          window.OPENROUTER_API_KEY = event.data.key;
        }
      });

      window.addEventListener('DOMContentLoaded', function() {        
        const rootElement = document.getElementById('root');
        if (rootElement) {
          const observer = new MutationObserver(function(mutations) {
            if (rootElement.children.length > 0) {
              pageIsLoaded();
              observer.disconnect();
            }
          });          
          observer.observe(rootElement, { childList: true, subtree: true });
        } else {
          pageIsLoaded();
        }
      });
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.jsx"></script>
  </body>
</html>`;

export const animationStyles = `
  @keyframes spin-slow {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .animate-spin-slow {
    animation: spin-slow 1s linear infinite;
  }
`;
