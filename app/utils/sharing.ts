/**
 * Utilities for sharing and clipboard operations
 */

/**
 * Copy text to clipboard using the Clipboard API with fallback for older browsers
 */
export function copyToClipboard(text: string): void {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log('Text copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  } else {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (err) {
      console.error('Fallback: Could not copy text: ', err);
    }
  }
}

/**
 * Encode application state to URL-safe string
 */
export function encodeStateToUrl(code: string, dependencies: Record<string, string>): string {
  try {
    const stateObj = { code, dependencies };
    const jsonStr = JSON.stringify(stateObj);
    const encoded = btoa(encodeURIComponent(jsonStr));
    return encoded;
  } catch (error) {
    console.error('Error encoding state to URL:', error);
    return '';
  }
}

/**
 * Decode URL-safe string to application state
 */
export function decodeStateFromUrl(encoded: string): {
  code: string;
  dependencies: Record<string, string>;
} {
  try {
    const jsonStr = decodeURIComponent(atob(encoded));
    const stateObj = JSON.parse(jsonStr);
    return {
      code: stateObj.code || '',
      dependencies: stateObj.dependencies || {},
    };
  } catch (error) {
    console.error('Error decoding state from URL:', error);
    return { code: '', dependencies: {} };
  }
}
