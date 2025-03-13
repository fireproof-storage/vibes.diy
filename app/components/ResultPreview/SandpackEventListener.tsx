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

    const unsubscribe = listen((message) => {
      if (message.type === 'start') {
        setBundlingComplete(false);
      } else if (message.type === 'urlchange') {
        console.log('urlchange', { isStreaming, message });
        setBundlingComplete(true);

        if (!isStreaming) {
          setActiveView('preview');

          // Screenshot capture logic
          if (onScreenshotCaptured) {
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
            }, 1000);
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
