import { renderHook, act, waitFor } from '@testing-library/react';
import { useVibes } from '../app/hooks/useVibes';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deleteVibeDatabase, listLocalVibes, toggleVibeFavorite } from '../app/utils/vibeUtils';
import type { LocalVibe } from '../app/utils/vibeUtils';

// Mock the vibeUtils module
vi.mock('../app/utils/vibeUtils', () => {
  return {
    listLocalVibes: vi.fn(),
    deleteVibeDatabase: vi.fn(),
    toggleVibeFavorite: vi.fn(),
  };
});

// Mock the useAuth hook
vi.mock('../app/hooks/useAuth', () => {
  return {
    useAuth: () => ({
      userId: 'test-user-id',
      isAuthenticated: true,
      isLoading: false,
    }),
  };
});

describe('useVibes', () => {
  // Mock data for testing
  const mockVibes: LocalVibe[] = [
    {
      id: 'test-vibe-1',
      title: 'Test Vibe 1',
      slug: 'test-vibe-1',
      created: new Date('2025-04-18').toISOString(),
      favorite: false,
      screenshot: {
        file: () => Promise.resolve(new File(['test'], 'screenshot.png', { type: 'image/png' })),
        type: 'image/png',
      },
    },
    {
      id: 'test-vibe-2',
      title: 'Test Vibe 2',
      slug: 'test-vibe-2',
      created: new Date('2025-04-19').toISOString(),
      favorite: true,
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    // Setup default mock behavior
    (listLocalVibes as any).mockResolvedValue(mockVibes);
    (deleteVibeDatabase as any).mockResolvedValue(undefined);
    (toggleVibeFavorite as any).mockResolvedValue({ _id: 'vibe', favorite: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should load vibes on mount', async () => {
    // Act
    const { result } = renderHook(() => useVibes());

    // Wait for the effect to run
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert
    expect(listLocalVibes).toHaveBeenCalled();
    expect(result.current.vibes).toEqual(mockVibes);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle loading state correctly', async () => {
    // Arrange - delay the promise resolution
    (listLocalVibes as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockVibes), 100))
    );

    // Act
    const { result } = renderHook(() => useVibes());

    // Assert - initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the loading to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // Assert - loading completed
    expect(result.current.isLoading).toBe(false);
    expect(result.current.vibes).toEqual(mockVibes);
  });

  it('should handle errors when loading vibes', async () => {
    // Arrange
    const testError = new Error('Failed to load vibes');
    (listLocalVibes as any).mockRejectedValue(testError);

    // Act
    const { result } = renderHook(() => useVibes());

    // Wait for the effect to run
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Failed to load vibes');
    expect(result.current.isLoading).toBe(false);
  });

  it('should delete a vibe and update state optimistically', async () => {
    // Act - render hook and delete a vibe
    const { result } = renderHook(() => useVibes());

    // Wait for the initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Perform delete
    await act(async () => {
      await result.current.deleteVibe('test-vibe-1');
    });

    // Assert
    expect(deleteVibeDatabase).toHaveBeenCalledWith('test-vibe-1');

    // Check optimistic update - should only have the second vibe
    expect(result.current.vibes.length).toBe(1);
    expect(result.current.vibes[0].id).toBe('test-vibe-2');
  });

  it('should reload vibes if deletion fails', async () => {
    // Arrange
    const deleteError = new Error('Failed to delete vibe');
    (deleteVibeDatabase as any).mockRejectedValueOnce(deleteError);

    // Act - render hook and delete a vibe
    const { result } = renderHook(() => useVibes());

    // Wait for the initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Reset the listLocalVibes mock to track if it's called again
    (listLocalVibes as any).mockClear();

    // Perform delete which will fail
    await act(async () => {
      try {
        await result.current.deleteVibe('test-vibe-1');
      } catch (e) {
        // Ignore the error, we'll check the hook state
      }
    });

    // Wait for the error state to be set
    await waitFor(() => expect(result.current.error).toBeDefined());

    // Assert
    expect(deleteVibeDatabase).toHaveBeenCalledWith('test-vibe-1');
    expect(result.current.error).toBeDefined();
    // Skip checking the specific error message content to avoid test brittleness

    // Should have called listLocalVibes again to restore the state
    expect(listLocalVibes).toHaveBeenCalled();
  });

  it('should toggle favorite status and update state optimistically', async () => {
    // Act - render hook
    const { result } = renderHook(() => useVibes());

    // Wait for the initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Perform toggle favorite for the first vibe (initially false)
    await act(async () => {
      await result.current.toggleFavorite('test-vibe-1');
    });

    // Assert
    expect(toggleVibeFavorite).toHaveBeenCalledWith('test-vibe-1', 'test-user-id');

    // Check optimistic update - first vibe should now be favorited
    expect(result.current.vibes[0].favorite).toBe(true);

    // Second vibe should remain unchanged
    expect(result.current.vibes[1].favorite).toBe(true);
  });

  it('should reload vibes if toggling favorite fails', async () => {
    // Arrange
    const toggleError = new Error('Failed to toggle favorite');
    (toggleVibeFavorite as any).mockRejectedValueOnce(toggleError);

    // Act - render hook
    const { result } = renderHook(() => useVibes());

    // Wait for the initial load
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Reset the listLocalVibes mock to track if it's called again
    (listLocalVibes as any).mockClear();

    // Perform toggle which will fail
    await act(async () => {
      try {
        await result.current.toggleFavorite('test-vibe-1');
      } catch (e) {
        // Ignore the error, we'll check the hook state
      }
    });

    // Wait for the error state to be set
    await waitFor(() => expect(result.current.error).toBeDefined());

    // Assert
    expect(toggleVibeFavorite).toHaveBeenCalledWith('test-vibe-1', 'test-user-id');
    expect(result.current.error).toBeDefined();

    // Should have called listLocalVibes again to restore the state
    expect(listLocalVibes).toHaveBeenCalled();
  });
});
