import React, { useState, createContext, useContext } from 'react';
import type { ViewType, ViewControlsType } from '../app/utils/ViewState';
import type { ChatMessageDocument } from '../app/types/chat';
import { BackButton } from '../app/components/ResultPreview/BackButton';
import { ViewControls } from '../app/components/ResultPreview/ViewControls';
import { ShareButton } from '../app/components/ResultPreview/ShareButton';
import { SaveButton } from '../app/components/ResultPreview/SaveButton';
import { ShareModal } from '../app/components/ResultPreview/ShareModal';

// Mock data
const mockMessages: ChatMessageDocument[] = [
  {
    _id: '1',
    session_id: 'test-session',
    text: 'Create a todo app',
    type: 'user',
    created_at: Date.now() - 1000,
  },
  {
    _id: '2', 
    session_id: 'test-session',
    text: 'Here is a todo app with React...',
    type: 'ai',
    created_at: Date.now(),
  },
];

// Context for managing mock state
interface MockStateContextType {
  isPublishing: boolean;
  setIsPublishing: (value: boolean) => void;
  urlCopied: boolean;
  setUrlCopied: (value: boolean) => void;
  publishedUrl: string;
  setPublishedUrl: (value: string) => void;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (value: boolean) => void;
  firehoseShared: boolean;
  setFirehoseShared: (value: boolean) => void;
}

const MockStateContext = createContext<MockStateContextType | null>(null);

const useMockState = () => {
  const context = useContext(MockStateContext);
  if (!context) {
    throw new Error('useMockState must be used within MockStateProvider');
  }
  return context;
};

// Mock state provider
const MockStateProvider: React.FC<{ 
  children: React.ReactNode;
  initialState?: Partial<MockStateContextType>;
}> = ({ children, initialState = {} }) => {
  const [isPublishing, setIsPublishing] = useState(initialState.isPublishing ?? false);
  const [urlCopied, setUrlCopied] = useState(initialState.urlCopied ?? false);
  const [publishedUrl, setPublishedUrl] = useState(initialState.publishedUrl ?? '');
  const [isShareModalOpen, setIsShareModalOpen] = useState(initialState.isShareModalOpen ?? false);
  const [firehoseShared, setFirehoseShared] = useState(initialState.firehoseShared ?? false);

  return (
    <MockStateContext.Provider value={{
      isPublishing,
      setIsPublishing,
      urlCopied,
      setUrlCopied,
      publishedUrl,
      setPublishedUrl,
      isShareModalOpen,
      setIsShareModalOpen,
      firehoseShared,
      setFirehoseShared,
    }}>
      {children}
    </MockStateContext.Provider>
  );
};

// Simplified header component that replicates the structure without complex dependencies
export interface MockedHeaderProps {
  // View state props
  displayView?: ViewType;
  showViewControls?: boolean;
  previewReady?: boolean;
  
  // Code state props
  hasCodeChanges?: boolean;
  syntaxErrorCount?: number;
  isStreaming?: boolean;
  
  // Mock state controls (for interactive demos)
  initialPublishedUrl?: string;
  initialIsPublishing?: boolean;
  initialUrlCopied?: boolean;
  initialIsShareModalOpen?: boolean;
  initialFirehoseShared?: boolean;
  
  // Event handlers
  onNavigateToView?: (view: ViewType) => void;
  onCodeSave?: () => void;
  onBackClick?: () => void;
}

export const MockedResultPreviewHeaderContent: React.FC<MockedHeaderProps> = ({
  displayView = 'preview',
  showViewControls = true,
  previewReady = true,
  hasCodeChanges = false,
  syntaxErrorCount = 0,
  isStreaming = false,
  initialPublishedUrl = '',
  initialIsPublishing = false,
  initialUrlCopied = false,
  initialIsShareModalOpen = false,
  initialFirehoseShared = false,
  onNavigateToView,
  onCodeSave,
  onBackClick,
}) => {
  const publishButtonRef = React.useRef<HTMLButtonElement>(null);
  
  // Create view controls based on current state
  const viewControls: ViewControlsType = {
    preview: {
      enabled: previewReady,
      icon: 'preview',
      label: 'Preview',
      loading: !previewReady,
    },
    code: {
      enabled: true,
      icon: 'code', 
      label: 'Code',
    },
    data: {
      enabled: true,
      icon: 'data',
      label: 'Data',
    },
  };

  const handleNavigateToView = (view: ViewType) => {
    onNavigateToView?.(view);
    console.log('Navigate to view:', view);
  };

  const handleCodeSave = () => {
    onCodeSave?.();
    console.log('Code save triggered');
  };

  const handleBackClick = () => {
    onBackClick?.();
    console.log('Back clicked');
  };

  return (
    <MockStateProvider initialState={{
      publishedUrl: initialPublishedUrl,
      isPublishing: initialIsPublishing,
      urlCopied: initialUrlCopied,
      isShareModalOpen: initialIsShareModalOpen,
      firehoseShared: initialFirehoseShared,
    }}>
      <MockedHeaderContent
        displayView={displayView}
        viewControls={viewControls}
        showViewControls={showViewControls}
        previewReady={previewReady}
        hasCodeChanges={hasCodeChanges}
        syntaxErrorCount={syntaxErrorCount}
        isStreaming={isStreaming}
        onNavigateToView={handleNavigateToView}
        onCodeSave={handleCodeSave}
        onBackClick={handleBackClick}
        publishButtonRef={publishButtonRef}
      />
    </MockStateProvider>
  );
};

// Internal component that uses the mock state
interface MockedHeaderContentProps {
  displayView: ViewType;
  viewControls: ViewControlsType;
  showViewControls: boolean;
  previewReady: boolean;
  hasCodeChanges: boolean;
  syntaxErrorCount: number;
  isStreaming: boolean;
  onNavigateToView: (view: ViewType) => void;
  onCodeSave: () => void;
  onBackClick: () => void;
  publishButtonRef: React.RefObject<HTMLButtonElement>;
}

const MockedHeaderContent: React.FC<MockedHeaderContentProps> = ({
  displayView,
  viewControls,
  showViewControls,
  previewReady,
  hasCodeChanges,
  syntaxErrorCount,
  isStreaming,
  onNavigateToView,
  onCodeSave,
  onBackClick,
  publishButtonRef,
}) => {
  const mockState = useMockState();

  // Mock publish functionality
  const handlePublish = async (shareToFirehose?: boolean) => {
    console.log('Mock handlePublish called with shareToFirehose:', shareToFirehose);
    mockState.setIsPublishing(true);
    mockState.setUrlCopied(false);
    
    // Simulate async publishing
    setTimeout(() => {
      const mockUrl = 'https://vibes.diy/published-app-' + Date.now();
      mockState.setPublishedUrl(mockUrl);
      mockState.setIsPublishing(false);
      mockState.setUrlCopied(true);
      if (shareToFirehose) {
        mockState.setFirehoseShared(true);
      }
    }, 2000);
  };

  const toggleShareModal = () => {
    mockState.setIsShareModalOpen(!mockState.isShareModalOpen);
  };

  return (
    <div className="flex h-full w-full items-center px-2 py-4">
      <div className="flex w-1/4 items-center justify-start">
        <BackButton
          onBackClick={() => {
            if (isStreaming) {
              console.log('User clicked back while streaming');
            }
            onBackClick();
          }}
        />
        {showViewControls ? null : <div className="h-10" />}
      </div>

      {/* Center - View controls */}
      <div className="flex w-1/2 items-center justify-center">
        {showViewControls && (
          <ViewControls
            viewControls={viewControls}
            currentView={displayView}
            onClick={onNavigateToView}
          />
        )}
      </div>
      
      {/* Right side - Save and Publish buttons */}
      <div className="flex w-1/4 items-center justify-end">
        <div className="flex items-center gap-2">
          {/* Save button - show when in code view and has changes */}
          {displayView === 'code' && hasCodeChanges && (
            <SaveButton
              onClick={onCodeSave}
              hasChanges={hasCodeChanges}
              syntaxErrorCount={syntaxErrorCount}
            />
          )}

          {showViewControls && previewReady && (
            <ShareButton
              ref={publishButtonRef}
              onClick={toggleShareModal}
              isPublishing={mockState.isPublishing}
              urlCopied={mockState.urlCopied}
              hasPublishedUrl={!!mockState.publishedUrl}
            />
          )}
        </div>
      </div>
      
      {/* Share Modal */}
      {mockState.isShareModalOpen && (
        <ShareModal
          isOpen={mockState.isShareModalOpen}
          onClose={() => mockState.setIsShareModalOpen(false)}
          buttonRef={publishButtonRef}
          publishedAppUrl={mockState.publishedUrl}
          onPublish={handlePublish}
          isPublishing={mockState.isPublishing}
          isFirehoseShared={mockState.firehoseShared}
        />
      )}
    </div>
  );
};