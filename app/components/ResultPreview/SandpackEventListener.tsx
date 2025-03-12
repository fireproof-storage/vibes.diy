import { useEffect } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';

interface SandpackEventListenerProps {
  setActiveView: (view: 'preview' | 'code') => void;
  setBundlingComplete: (complete: boolean) => void;
  isStreaming: boolean;
  onScreenshotCaptured?: (screenshotData: string) => void;
}

const SandpackEventListener: React.FC<SandpackEventListenerProps> = ({
  setActiveView,
  setBundlingComplete,
  isStreaming,
  onScreenshotCaptured,
}) => {
  const { listen } = useSandpack();

  useEffect(() => {
    setBundlingComplete(false);
    let startTime = Date.now();

    const resetTimer = () => {
      startTime = Date.now();
    };

    const unsubscribe = listen((message) => {
      if (message.type === 'start') {
        setBundlingComplete(false);
        resetTimer();
      } else if (message.type === 'urlchange') {
        setBundlingComplete(true);

        if (!isStreaming) {
          setActiveView('preview');

          // Screenshot capture logic
          if (onScreenshotCaptured) {
            const timeElapsed = Date.now() - startTime;
            const delay = timeElapsed < 1000 ? 1500 - timeElapsed : 500;

            setTimeout(() => {
              const sandpackPreview =
                document.querySelector<HTMLIFrameElement>('.sp-preview-iframe');
              if (sandpackPreview?.contentWindow) {
                try {
                  // Try to access the iframe content
                  const iframeDocument = sandpackPreview.contentWindow.document;
                  // Access html2canvas if available in the iframe (safe type cast)
                  const html2canvas = (sandpackPreview.contentWindow as any).html2canvas;

                  if (html2canvas && iframeDocument.body) {
                    html2canvas(iframeDocument.body, {
                      allowTaint: true,
                      useCORS: true,
                      backgroundColor: null,
                      scale: 2,
                    }).then((canvas: HTMLCanvasElement) => {
                      const screenshot = canvas.toDataURL('image/png');
                      onScreenshotCaptured(screenshot);
                    });
                  }
                } catch (e) {
                  console.error('Failed to capture screenshot:', e);
                }
              }
            }, delay);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [listen, setActiveView, setBundlingComplete, isStreaming, onScreenshotCaptured]);

  return null;
};

export default SandpackEventListener;
