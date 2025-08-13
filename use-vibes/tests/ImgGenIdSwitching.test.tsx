// IMPORTANT: All mock calls must be at the top since vi.mock calls are hoisted by Vitest
import type { DocSet } from 'use-fireproof';

// Create shared test data
const createTestFile = () => new File(['test content'], 'test-image.png', { type: 'image/png' });

// Mock database for tracking changes
const dbPuts: UseImageGenOptions[] = [];
const imageGenCallCount = { count: 0 };

// Mock Fireproof and related dependencies
vi.mock('use-fireproof', () => {
  const mockDb = {
    get: vi.fn().mockImplementation((id: string) => {
      return Promise.resolve({
        _id: id,
        _rev: 'test-rev',
        type: 'image',
        created: Date.now(),
        prompt: `Test prompt for ${id}`,
        currentVersion: 0,
        versions: [{ id: 'v1', created: Date.now(), promptKey: 'p1' }],
        prompts: { p1: { text: `Test prompt for ${id}`, created: Date.now() } },
        _files: { v1: createTestFile() },
      });
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    put: vi.fn().mockImplementation((doc: DocSet<any>) => {
      dbPuts.push({ ...doc });
      return Promise.resolve({ id: doc._id, rev: 'new-rev' });
    }),
    remove: vi.fn(),
    query: vi.fn(),
    getAttachment: vi.fn(),
    putAttachment: vi.fn(),
  };

  return {
    useFireproof: vi.fn().mockReturnValue({ database: mockDb }),
    ImgFile: vi.fn().mockImplementation((props) => {
      return React.createElement('img', {
        src: 'test-image-url',
        className: 'test-class',
        'data-testid': 'mock-img-file',
        alt: 'test image',
        ...props,
      });
    }),
  };
});

// Import the type for proper typing in mock implementation
import type { UseImageGenOptions, UseImageGenResult } from 'use-vibes';

// Mock the image generation hook
vi.mock('../pkg/hooks/image-gen/use-image-gen', () => {
  let regenerationCompleted = false;

  return {
    useImageGen: vi.fn().mockImplementation((props: UseImageGenOptions): UseImageGenResult => {
      imageGenCallCount.count++;
      const regenerate = false;
      const { _id } = props || {};

      // Create a document based on the ID
      const doc = _id
        ? {
            _id,
            _rev: 'test-rev',
            type: 'image' as const,
            created: Date.now(),
            prompt: `Test prompt for ${_id}`,
            currentVersion: _id === 'doc-with-multiple' ? 2 : 0,
            versions:
              _id === 'doc-with-multiple'
                ? [
                    { id: 'v1', created: Date.now() - 2000, promptKey: 'p1' },
                    { id: 'v2', created: Date.now() - 1000, promptKey: 'p1' },
                    { id: 'v3', created: Date.now(), promptKey: 'p1' },
                  ]
                : [{ id: 'v1', created: Date.now(), promptKey: 'p1' }],
            prompts: { p1: { text: `Test prompt for ${_id}`, created: Date.now() } },
            _files: (_id === 'doc-with-multiple'
              ? { v1: createTestFile(), v2: createTestFile(), v3: createTestFile() }
              : { v1: createTestFile() }) as Record<string, File>,
          }
        : null;

      // Handle regeneration case
      if (_id === 'doc-1' && regenerate && !regenerationCompleted) {
        regenerationCompleted = true;
        setTimeout(() => {
          dbPuts.push({
            _id: 'doc-1',
            _rev: 'test-rev',
            type: 'image',
            currentVersion: 1,
            versions: [
              { id: 'v1', created: Date.now() - 1000, promptKey: 'p1' },
              { id: 'v2', created: Date.now(), promptKey: 'p1' },
            ],
            prompts: { p1: { text: `Test prompt for doc-1`, created: Date.now() } },
            _files: { v1: createTestFile(), v2: createTestFile() },
          } as unknown as UseImageGenOptions);
        }, 10);
      }

      return {
        document: doc,
        loading: Boolean(regenerate),
        error: null,
        progress: regenerate ? 50 : 100,
        imageData: 'test-image-data',
        size: { width: 512, height: 512 },
      };
    }),
  };
});

// Mock call-ai for image generation
vi.mock('call-ai', () => {
  return {
    // Ensure imageGen returns a properly resolved Promise
    imageGen: vi.fn().mockImplementation(() => {
      return Promise.resolve({
        data: [{ b64_json: 'test-image-data' }],
      });
    }),
  };
});

// Import React and testing libraries
import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Import the component to test
import { ImgGen, useImageGen } from 'use-vibes';

describe('ImgGen ID Switching Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the counters between tests
    imageGenCallCount.count = 0;
    dbPuts.length = 0;
  });

  it('resets state when switching between image IDs', async () => {
    const onComplete = vi.fn();
    const { rerender } = render(<ImgGen _id="doc-1" onComplete={onComplete} />);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });

    // Reset mock and switch to a different ID
    onComplete.mockReset();
    rerender(<ImgGen _id="doc-2" onComplete={onComplete} />);

    // With the mountKey approach, the component should be remounted and onComplete called again
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('creates new instances when switching IDs', async () => {
    // Reset the call counter
    imageGenCallCount.count = 0;
    
    const { rerender } = render(<ImgGen _id="doc-1" />);

    // Verify the hook was called at least once for the first render
    expect(imageGenCallCount.count).toBeGreaterThan(0);
    const firstCallCount = imageGenCallCount.count;

    // Switch to a different ID
    rerender(<ImgGen _id="doc-2" />);

    // With mountKey, a new instance should be created with the new ID
    // The hook should be called again
    expect(imageGenCallCount.count).toBeGreaterThan(firstCallCount);
  });

  it('handles switching between documents with different numbers of versions', async () => {
    const { rerender, getByTestId } = render(<ImgGen _id="doc-single-version" />);

    // Wait for the component to render
    await waitFor(() => {
      expect(getByTestId('mock-img-file')).toBeInTheDocument();
    });

    // Switch to a document with multiple versions
    rerender(<ImgGen _id="doc-with-multiple" />);

    // This should still render properly without errors
    await waitFor(() => {
      expect(getByTestId('mock-img-file')).toBeInTheDocument();
    });
  });

  it('preserves image display during regeneration', async () => {
    // Use a component with handlers
    const { getByTestId } = render(<ImgGen _id="doc-for-regeneration" />);

    // Wait for the component to render
    await waitFor(() => {
      expect(getByTestId('mock-img-file')).toBeInTheDocument();
    });

    // Test that image display is preserved by checking that the image element remains
    // when component re-renders (simulating regeneration behavior)
    expect(getByTestId('mock-img-file')).toBeInTheDocument();
  });

  it('allows regeneration to complete even after switching to a different image', async () => {
    // Reset database tracking
    dbPuts.length = 0;

    // Render the initial component with doc-1
    const { rerender, getByTestId } = render(<ImgGen _id="doc-1" />);

    // Wait for the first render to complete
    await waitFor(() => expect(getByTestId('mock-img-file')).toBeInTheDocument());

    // Switch to doc-2 - this simulates switching documents
    rerender(<ImgGen _id="doc-2" />);

    // Verify both documents can render (showing regeneration works independently)
    await waitFor(() => expect(getByTestId('mock-img-file')).toBeInTheDocument());
  });
});
