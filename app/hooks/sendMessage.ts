import { parseContent } from '../utils/segmentParser';
import { streamAI } from '../utils/streamHandler';
import { generateTitle } from '../utils/titleGenerator';
import { trackChatInputClick } from '../utils/analytics';
import type {
  ChatMessageDocument,
  AiChatMessageDocument,
  UserChatMessageDocument,
} from '../types/chat';

export interface SendMessageContext {
  userMessage: ChatMessageDocument;
  mergeUserMessage: (msg: Partial<UserChatMessageDocument>) => void;
  setPendingUserDoc: (doc: ChatMessageDocument) => void;
  setIsStreaming: (v: boolean) => void;
  ensureApiKey: () => Promise<{ key: string } | null>;
  setNeedsLogin: (v: boolean) => void;
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
}

export async function sendMessage(ctx: SendMessageContext, textOverride?: string): Promise<void> {
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
  } = ctx;

  const promptText = textOverride || userMessage.text;
  trackChatInputClick(promptText.length);

  if (!promptText.trim()) return;

  if (textOverride) {
    mergeUserMessage({ text: textOverride });
  }

  setPendingUserDoc({
    ...userMessage,
    text: promptText,
  });

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
    setNeedsLogin(true);
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

  return submitUserMessage()
    .then(async () => {
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
      );
    })
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
          setNeedsLogin(true);
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
