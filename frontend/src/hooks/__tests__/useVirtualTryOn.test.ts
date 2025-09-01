// Tests for useVirtualTryOn hook
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVirtualTryOn } from '../useVirtualTryOn';
import { mockVirtualTryOnResponse, mockRecommendationResponse, mockApiFile, mockClothingItems } from '../../test/mocks';

// Mock the API service
const mockApiService = {
    combineImages: vi.fn(),
    getRecommendationsFromFitting: vi.fn()
};

vi.mock('../../services/api.service', () => ({
    apiService: mockApiService
}));

describe('useVirtualTryOn', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useVirtualTryOn());

        expect(result.current.personImage).toBeNull();
        expect(result.current.clothingItems).toEqual({
            top: null,
            pants: null,
            shoes: null
        });
        expect(result.current.generatedImage).toBeNull();
        expect(result.current.recommendations).toBeNull();
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.isLoadingRecommendations).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should set person image', () => {
        const { result } = renderHook(() => useVirtualTryOn());

        act(() => {
            result.current.setPersonImage(mockApiFile);
        });

        expect(result.current.personImage).toEqual(mockApiFile);
    });

    it('should set clothing items', () => {
        const { result } = renderHook(() => useVirtualTryOn());

        act(() => {
            result.current.setClothingItem('top', mockApiFile);
        });

        expect(result.current.clothingItems.top).toEqual(mockApiFile);
        expect(result.current.clothingItems.pants).toBeNull();
        expect(result.current.clothingItems.shoes).toBeNull();
    });

    it('should remove clothing items', () => {
        const { result } = renderHook(() => useVirtualTryOn());

        // Set an item first
        act(() => {
            result.current.setClothingItem('top', mockApiFile);
        });

        expect(result.current.clothingItems.top).toEqual(mockApiFile);

        // Remove it
        act(() => {
            result.current.removeClothingItem('top');
        });

        expect(result.current.clothingItems.top).toBeNull();
    });

    it('should generate virtual try-on successfully', async () => {
        mockApiService.combineImages.mockResolvedValue(mockVirtualTryOnResponse);

        const { result } = renderHook(() => useVirtualTryOn());

        // Set required data
        act(() => {
            result.current.setPersonImage(mockApiFile);
            result.current.setClothingItem('top', mockApiFile);
        });

        await act(async () => {
            await result.current.generateVirtualTryOn();
        });

        expect(mockApiService.combineImages).toHaveBeenCalledWith(
            mockApiFile,
            mockClothingItems
        );
        expect(result.current.generatedImage).toBe(mockVirtualTryOnResponse.generatedImage);
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should handle virtual try-on generation error', async () => {
        const error = new Error('Generation failed');
        mockApiService.combineImages.mockRejectedValue(error);

        const { result } = renderHook(() => useVirtualTryOn());

        // Set required data
        act(() => {
            result.current.setPersonImage(mockApiFile);
            result.current.setClothingItem('top', mockApiFile);
        });

        await act(async () => {
            await result.current.generateVirtualTryOn();
        });

        expect(result.current.generatedImage).toBeNull();
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.error).toBe(error);
    });

    it('should not generate without person image', async () => {
        const { result } = renderHook(() => useVirtualTryOn());

        // Set only clothing item
        act(() => {
            result.current.setClothingItem('top', mockApiFile);
        });

        await act(async () => {
            await result.current.generateVirtualTryOn();
        });

        expect(mockApiService.combineImages).not.toHaveBeenCalled();
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toContain('Person image is required');
    });

    it('should not generate without clothing items', async () => {
        const { result } = renderHook(() => useVirtualTryOn());

        // Set only person image
        act(() => {
            result.current.setPersonImage(mockApiFile);
        });

        await act(async () => {
            await result.current.generateVirtualTryOn();
        });

        expect(mockApiService.combineImages).not.toHaveBeenCalled();
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toContain('At least one clothing item is required');
    });

    it('should set loading state during generation', async () => {
        let resolvePromise: (value: any) => void;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        mockApiService.combineImages.mockReturnValue(promise);

        const { result } = renderHook(() => useVirtualTryOn());

        // Set required data
        act(() => {
            result.current.setPersonImage(mockApiFile);
            result.current.setClothingItem('top', mockApiFile);
        });

        act(() => {
            result.current.generateVirtualTryOn();
        });

        expect(result.current.isGenerating).toBe(true);

        await act(async () => {
            resolvePromise(mockVirtualTryOnResponse);
            await promise;
        });

        expect(result.current.isGenerating).toBe(false);
    });

    it('should get recommendations from fitting result', async () => {
        mockApiService.getRecommendationsFromFitting.mockResolvedValue(mockRecommendationResponse);

        const { result } = renderHook(() => useVirtualTryOn());

        // Set generated image first
        act(() => {
            result.current.setGeneratedImage('data:image/jpeg;base64,generated');
        });

        await act(async () => {
            await result.current.getRecommendationsFromFitting();
        });

        expect(mockApiService.getRecommendationsFromFitting).toHaveBeenCalledWith(
            'data:image/jpeg;base64,generated',
            {}
        );
        expect(result.current.recommendations).toBe(mockRecommendationResponse.recommendations);
        expect(result.current.isLoadingRecommendations).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should handle recommendations error', async () => {
        const error = new Error('Recommendations failed');
        mockApiService.getRecommendationsFromFitting.mockRejectedValue(error);

        const { result } = renderHook(() => useVirtualTryOn());

        // Set generated image first
        act(() => {
            result.current.setGeneratedImage('data:image/jpeg;base64,generated');
        });

        await act(async () => {
            await result.current.getRecommendationsFromFitting();
        });

        expect(result.current.recommendations).toBeNull();
        expect(result.current.isLoadingRecommendations).toBe(false);
        expect(result.current.error).toBe(error);
    });

    it('should not get recommendations without generated image', async () => {
        const { result } = renderHook(() => useVirtualTryOn());

        await act(async () => {
            await result.current.getRecommendationsFromFitting();
        });

        expect(mockApiService.getRecommendationsFromFitting).not.toHaveBeenCalled();
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toContain('Generated image is required');
    });

    it('should reset all state', () => {
        const { result } = renderHook(() => useVirtualTryOn());

        // Set some state
        act(() => {
            result.current.setPersonImage(mockApiFile);
            result.current.setClothingItem('top', mockApiFile);
            result.current.setGeneratedImage('data:image/jpeg;base64,test');
            result.current.setRecommendations(mockRecommendationResponse.recommendations);
        });

        expect(result.current.personImage).toEqual(mockApiFile);
        expect(result.current.clothingItems.top).toEqual(mockApiFile);
        expect(result.current.generatedImage).toBe('data:image/jpeg;base64,test');
        expect(result.current.recommendations).toEqual(mockRecommendationResponse.recommendations);

        // Reset
        act(() => {
            result.current.reset();
        });

        expect(result.current.personImage).toBeNull();
        expect(result.current.clothingItems).toEqual({
            top: null,
            pants: null,
            shoes: null
        });
        expect(result.current.generatedImage).toBeNull();
        expect(result.current.recommendations).toBeNull();
        expect(result.current.error).toBeNull();
    });

    it('should clear error when setting new data', () => {
        const { result } = renderHook(() => useVirtualTryOn());

        // Set error
        act(() => {
            result.current.setError(new Error('Test error'));
        });

        expect(result.current.error).toBeInstanceOf(Error);

        // Setting new data should clear error
        act(() => {
            result.current.setPersonImage(mockApiFile);
        });

        expect(result.current.error).toBeNull();
    });

    it('should validate clothing items have at least one item', () => {
        const { result } = renderHook(() => useVirtualTryOn());

        const emptyClothingItems = { top: null, pants: null, shoes: null };
        const hasClothingItems = result.current.hasClothingItems(emptyClothingItems);

        expect(hasClothingItems).toBe(false);

        const nonEmptyClothingItems = { top: mockApiFile, pants: null, shoes: null };
        const hasClothingItems2 = result.current.hasClothingItems(nonEmptyClothingItems);

        expect(hasClothingItems2).toBe(true);
    });
});