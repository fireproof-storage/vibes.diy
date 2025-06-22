import type {
  AiChatMessageDocument,
  ChatMessageDocument,
  UserChatMessageDocument,
} from '../types/chat';
import { trackChatInputClick } from '../utils/analytics';
import { parseContent } from '../utils/segmentParser';
import { streamAI } from '../utils/streamHandler';
import { generateTitle } from '../utils/titleGenerator';

export interface SendMessageContext {
  userMessage: ChatMessageDocument;
  mergeUserMessage: (msg: Partial<UserChatMessageDocument>) => void;
  setPendingUserDoc: (doc: ChatMessageDocument) => void;
  setIsStreaming: (v: boolean) => void;
  ensureApiKey: () => Promise<{ key: string } | null>;
  setNeedsLogin: (v: boolean, reason: string) => void;
  setNeedsNewKey: (v: boolean) => void;
  addError: (err: any) => void;
  checkCredits: (key: string) => Promise<boolean>;
  ensureSystemPrompt: () => Promise<string>;
  submitUserMessage: () => Promise<any>;
  buildMessageHistory: () => any[];
  modelToUse: string;
  throttledMergeAiMessage: (content: string) => void;
  isProcessingRef: { current: boolean };
  aiMessage: AiChatMessageDocument;
  sessionDatabase: any;
  setPendingAiMessage: (doc: ChatMessageDocument | null) => void;
  setSelectedResponseId: (id: string) => void;
  updateTitle: (title: string) => void;
  setInput: (text: string) => void;
  userId: string | undefined;
  titleModel: string;
  isAuthenticated: boolean;
}

export async function sendMessage(
  ctx: SendMessageContext,
  textOverride?: string,
  skipSubmit: boolean = false
): Promise<void> {
  const {
    userMessage,
    mergeUserMessage,
    setPendingUserDoc,
    setIsStreaming,
    ensureApiKey,
    setNeedsLogin,
    setNeedsNewKey,
    addError,
    checkCredits,
    ensureSystemPrompt,
    submitUserMessage,
    buildMessageHistory,
    modelToUse,
    throttledMergeAiMessage,
    isProcessingRef,
    aiMessage,
    sessionDatabase,
    setPendingAiMessage,
    setSelectedResponseId,
    updateTitle,
    setInput,
    userId,
    titleModel,
    isAuthenticated,
  } = ctx;

  const promptText = typeof textOverride === 'string' ? textOverride : userMessage.text;
  trackChatInputClick(promptText.length);

  if (!promptText.trim()) return;

  // Allow user message to be submitted, but check authentication for AI processing
  if (!isAuthenticated) {
    setNeedsLogin(true, 'sendMessage not authenticated');
  }

  if (typeof textOverride === 'string' && !skipSubmit) {
    // Update the transient userMessage state so UI reflects any override text
    // Only update when we are not in retry mode (skipSubmit === false)
    mergeUserMessage({ text: textOverride });
  }

  setPendingUserDoc({
    ...userMessage,
    text: promptText,
  });

  // Always submit the user message first unless we are retrying the same
  // message (e.g. after login / API key refresh)
  if (!skipSubmit) {
    await submitUserMessage();
    // Clear the chat input once the user message has been submitted
    setInput('');
  }

  setIsStreaming(true);

  let currentApiKey: string;
  try {
    const keyObject = await ensureApiKey();
    if (!keyObject?.key) {
      throw new Error('API key not found after ensureApiKey call.');
    }
    currentApiKey = keyObject.key;
  } catch (err) {
    console.warn('sendMessage: Failed to ensure API key:', err);
    setNeedsLogin(true, 'sendMessage failed to ensure API key');
    setNeedsNewKey(true);
    addError({
      type: 'error',
      message: 'API key is required. Please log in or ensure your key is valid.',
      errorType: 'Other',
      source: 'sendMessage',
      timestamp: new Date().toISOString(),
    });
    setIsStreaming(false);
    return;
  }

  const hasSufficientCredits = await checkCredits(currentApiKey);
  if (!hasSufficientCredits) {
    setIsStreaming(false);
    return;
  }

  const currentSystemPrompt = await ensureSystemPrompt();

  // Now proceed with AI processing for authenticated users
  const messageHistory = buildMessageHistory();

  return streamAI(
    modelToUse,
    currentSystemPrompt,
    messageHistory,
    promptText,
    (content) => throttledMergeAiMessage(content),
    currentApiKey,
    userId,
    setNeedsLogin
  )
    .then(async (finalContent) => {
      isProcessingRef.current = true;

      try {
        if (typeof finalContent === 'string' && finalContent.startsWith('{')) {
          try {
            const parsedContent = JSON.parse(finalContent);

            if (parsedContent.error) {
              setNeedsNewKey(true);
              setInput(promptText);
              finalContent = `Error: ${JSON.stringify(parsedContent.error)}`;
            } else {
              finalContent = parsedContent;
            }
          } catch (jsonError) {
            console.warn('Error parsing JSON response:', jsonError, finalContent);
          }
        }

        if (
          !finalContent ||
          (typeof finalContent === 'string' && finalContent.trim().length === 0)
        ) {
          setNeedsLogin(true, 'empty response');
          return;
        }

        if (aiMessage?.text !== finalContent) {
          aiMessage.text = finalContent;
        }

        aiMessage.model = modelToUse;
        const { id } = (await sessionDatabase.put(aiMessage)) as { id: string };
        setPendingAiMessage({ ...aiMessage, _id: id });
        setSelectedResponseId(id);

        const { segments } = parseContent(aiMessage?.text || '');
        try {
          const title = await generateTitle(segments, titleModel, currentApiKey);
          if (title) {
            updateTitle(title);
          }
        } catch (titleError) {
          console.warn('Failed to generate title:', titleError);
        }
      } finally {
        isProcessingRef.current = false;
      }
    })
    .catch((error: any) => {
      console.warn('Error in sendMessage:', error);
      isProcessingRef.current = false;
      setPendingAiMessage(null);
      setSelectedResponseId('');
    })
    .finally(() => {
      setIsStreaming(false);
      if (currentApiKey) {
        checkCredits(currentApiKey).catch((err) => {
          console.warn('Failed to check credits in finally block:', err);
        });
      }
    });
}
