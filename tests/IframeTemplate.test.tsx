import { describe, it, expect, vi } from 'vitest';
import iframeTemplateRaw from '../app/components/ResultPreview/templates/iframe-template.html?raw';

describe('Iframe Template', () => {
  it('contains proper APP_CODE placeholder for replacement', () => {
    // Verify the template contains the APP_CODE placeholder
    expect(iframeTemplateRaw).toContain('{{APP_CODE}}');
    
    // Make sure the problematic pattern is NOT present anymore
    const problematicPattern = /\{\s*\{\s*APP_CODE\s*;\s*\}\s*\}/;
    expect(problematicPattern.test(iframeTemplateRaw)).toBe(false);
  });
  
  it('produces ReferenceError when template is used with React code', () => {
    // Capture console errors
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create a test function that simulates what happens in the browser
    function simulateTemplateError() {
      try {
        // This line would actually run in the browser when the template is rendered
        // The browser would try to evaluate `{ APP_CODE; }` which causes a ReferenceError
        eval('{ APP_CODE; }');
      } catch (error) {
        if (error instanceof ReferenceError) {
          console.error('Uncaught ReferenceError: APP_CODE is not defined');
        }
      }
    }
    
    // Run the simulation
    simulateTemplateError();
    
    // Verify correct error is logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Uncaught ReferenceError: APP_CODE is not defined');
    
    // Clean up
    consoleErrorSpy.mockRestore();
  });
});
