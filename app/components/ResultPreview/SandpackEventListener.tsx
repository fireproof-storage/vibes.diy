import { useEffect } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';

interface SandpackEventListenerProps {
  setActiveView: (view: 'preview' | 'code') => void;
  setBundlingComplete: (complete: boolean) => void;
  isStreaming: boolean;
}

const SandpackEventListener: React.FC<SandpackEventListenerProps> = ({
  setActiveView,
  setBundlingComplete,
  isStreaming,
}) => {
  const { listen } = useSandpack();

  useEffect(() => {
    setBundlingComplete(false);

    const unsubscribe = listen((message) => {
      if (message.type === 'start') {
        console.log('Sandpack bundling started');
        setBundlingComplete(false);
      } else if (message.type === 'urlchange') {
        console.log('Sandpack bundling complete, isStreaming:', isStreaming);
        setBundlingComplete(true);

        // Only switch to preview if we're not streaming
        if (!isStreaming) {
          console.log('Switching to preview view after bundling');
          setTimeout(() => {
            setActiveView('preview');
          }, 100); // Small delay to ensure state updates have propagated
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [listen, setActiveView, setBundlingComplete, isStreaming]);

  return null;
};

export default SandpackEventListener;
