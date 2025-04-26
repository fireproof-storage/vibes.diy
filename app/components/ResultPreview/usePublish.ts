import { useState, useEffect } from 'react';
import { publishApp } from '../../utils/publishUtils';
import { trackPublishClick } from '../../utils/analytics';
import type { ChatMessageDocument } from '../../types/chat';

interface UsePublishProps {
  sessionId: string | undefined;
  code: string;
  title: string | undefined;
  messages: ChatMessageDocument[];
  updatePublishedUrl: (url: string) => Promise<void>;
  publishedUrl?: string;
}

export const usePublish = ({
  sessionId,
  code,
  title,
  messages,
  updatePublishedUrl,
  publishedUrl: initialPublishedUrl,
}: UsePublishProps) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [publishedAppUrl, setPublishedAppUrl] = useState<string | undefined>(initialPublishedUrl);

  // Update publishedAppUrl when the initial URL changes
  useEffect(() => {
    if (initialPublishedUrl) {
      setPublishedAppUrl(initialPublishedUrl);
    }
  }, [initialPublishedUrl]);

  useEffect(() => {
    if (publishedAppUrl) {
      console.debug('Published URL updated:', publishedAppUrl);
    }
  }, [publishedAppUrl]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setUrlCopied(false);
    try {
      if (!messages.length) {
        setIsPublishing(false);
        return;
      }

      let prompt = messages[0].text;
      const userMessages = messages.filter((message) => message.type === 'user');

      if (userMessages.length > 1) {
        if (userMessages[0]._id === '0001-user-first') {
          prompt = userMessages[1].text;
        }
      }

      const appUrl = await publishApp({
        sessionId,
        code,
        title,
        prompt,
        updatePublishedUrl,
      });

      if (appUrl) {
        setPublishedAppUrl(appUrl);
        // Copy the URL to clipboard after publishing
        await navigator.clipboard.writeText(appUrl);
        setUrlCopied(true);

        // Trigger analytics
        trackPublishClick({ publishedAppUrl: appUrl });

        // Reset the copied state after 3 seconds
        setTimeout(() => {
          setUrlCopied(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error in handlePublish:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  const toggleShareModal = () => {
    // Simply toggle the modal visibility, don't publish automatically
    setIsShareModalOpen(!isShareModalOpen);
  };

  return {
    isPublishing,
    urlCopied,
    publishedAppUrl,
    handlePublish,
    isShareModalOpen,
    setIsShareModalOpen,
    toggleShareModal,
  };
};
