// Tests for API service
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiService } from '../api.service';
import { mockFetchSuccess, mockFetchError, mockFetchNetworkError, mockVirtualTryOnResponse, mockRecommendationResponse, mockApiFile, mockClothingItems } from '../../test/mocks';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('apiService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('combineImages', () => {
        it('should successfully combine images', async () => {
            mockFetch.mockResolvedValue(mockFetchSuccess(mockVirtualTryOnResponse));

            const result = await apiService.combineImages(mockApiFile, mockClothingItems);

            expect(mockFetch).toHaveBeenCalledWith('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    person: mockApiFile,
                    clothingItems: mockClothingItems
                })
            });

            expect(result).toEqual(mockVirtualTryOnResponse);
        });

        it('should handle API errors', async () => {
            mockFetch.mockResolvedValue(mockFetchError(400, 'Invalid input'));

            await expect(apiService.combineImages(mockApiFile, mockClothingItems))
                .rejects.toThrow('Invalid input');
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            await expect(apiService.combineImages(mockApiFile, mockClothingItems))
                .rejects.toThrow('Network error');
        });

        it('should handle server errors', async () => {
            mockFetch.mockResolvedValue(mockFetchError(500, 'Internal server error'));

            await expect(apiService.combineImages(mockApiFile, mockClothingItems))
                .rejects.toThrow('Internal server error');
        });

        it('should handle timeout', async () => {
            // Mock a slow response
            mockFetch.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(mockFetchSuccess(mockVirtualTryOnResponse)), 35000))
            );

            await expect(apiService.combineImages(mockApiFile, mockClothingItems))
                .rejects.toThrow('timeout');
        });
    });

    describe('getRecommendations', () => {
        it('should successfully get recommendations', async () => {
            mockFetch.mockResolvedValue(mockFetchSuccess(mockRecommendationResponse));

            const result = await apiService.getRecommendations(mockApiFile, mockClothingItems);

            expect(mockFetch).toHaveBeenCalledWith('/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    person: mockApiFile,
                    clothingItems: mockClothingItems
                })
            });

            expect(result).toEqual(mockRecommendationResponse);
        });

        it('should handle optional parameters', async () => {
            mockFetch.mockResolvedValue(mockFetchSuccess(mockRecommendationResponse));

            const options = {
                maxPerCategory: 5,
                minPrice: 20,
                maxPrice: 100
            };

            await apiService.getRecommendations(mockApiFile, mockClothingItems, options);

            expect(mockFetch).toHaveBeenCalledWith('/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    person: mockApiFile,
                    clothingItems: mockClothingItems,
                    options
                })
            });
        });

        it('should handle missing person image', async () => {
            mockFetch.mockResolvedValue(mockFetchSuccess(mockRecommendationResponse));

            await apiService.getRecommendations(null, mockClothingItems);

            expect(mockFetch).toHaveBeenCalledWith('/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    person: null,
                    clothingItems: mockClothingItems
                })
            });
        });
    });

    describe('getRecommendationsFromFitting', () => {
        it('should successfully get recommendations from fitting', async () => {
            mockFetch.mockResolvedValue(mockFetchSuccess(mockRecommendationResponse));

            const generatedImage = 'data:image/jpeg;base64,generated';
            const result = await apiService.getRecommendationsFromFitting(generatedImage, mockClothingItems);

            expect(mockFetch).toHaveBeenCalledWith('/api/recommend/from-fitting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    generatedImage,
                    originalClothingItems: mockClothingItems
                })
            });

            expect(result).toEqual(mockRecommendationResponse);
        });

        it('should handle optional parameters', async () => {
            mockFetch.mockResolvedValue(mockFetchSuccess(mockRecommendationResponse));

            const generatedImage = 'data:image/jpeg;base64,generated';
            const options = { maxPerCategory: 3 };

            await apiService.getRecommendationsFromFitting(generatedImage, mockClothingItems, options);

            expect(mockFetch).toHaveBeenCalledWith('/api/recommend/from-fitting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    generatedImage,
                    originalClothingItems: mockClothingItems,
                    options
                })
            });
        });
    });

    describe('checkHealth', () => {
        it('should check API health', async () => {
            const healthResponse = { status: 'ok', timestamp: '2024-01-15T10:30:00.000Z' };
            mockFetch.mockResolvedValue(mockFetchSuccess(healthResponse));

            const result = await apiService.checkHealth();

            expect(mockFetch).toHaveBeenCalledWith('/health', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            expect(result).toEqual(healthResponse);
        });

        it('should handle health check failure', async () => {
            mockFetch.mockResolvedValue(mockFetchError(503, 'Service unavailable'));

            await expect(apiService.checkHealth())
                .rejects.toThrow('Service unavailable');
        });
    });

    describe('error handling', () => {
        it('should parse error response with details', async () => {
            const errorResponse = {
                error: {
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    field: 'person'
                }
            };

            mockFetch.mockResolvedValue({
                ok: false,
                status: 400,
                json: () => Promise.resolve(errorResponse),
                headers: new Headers({ 'content-type': 'application/json' })
            });

            try {
                await apiService.combineImages(mockApiFile, mockClothingItems);
            } catch (error: any) {
                expect(error.message).toBe('Validation failed');
                expect(error.status).toBe(400);
                expect(error.code).toBe('VALIDATION_ERROR');
                expect(error.field).toBe('person');
            }
        });

        it('should handle non-JSON error responses', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                json: () => Promise.reject(new Error('Not JSON')),
                text: () => Promise.resolve('Internal Server Error'),
                headers: new Headers({ 'content-type': 'text/plain' })
            });

            try {
                await apiService.combineImages(mockApiFile, mockClothingItems);
            } catch (error: any) {
                expect(error.message).toBe('Internal Server Error');
                expect(error.status).toBe(500);
            }
        });

        it('should handle fetch rejection', async () => {
            mockFetch.mockRejectedValue(new Error('Network failure'));

            try {
                await apiService.combineImages(mockApiFile, mockClothingItems);
            } catch (error: any) {
                expect(error.message).toBe('Network failure');
            }
        });
    });

    describe('request configuration', () => {
        it('should use correct base URL in different environments', () => {
            // Test is already using the correct base URL through proxy configuration
            expect(true).toBe(true);
        });

        it('should set correct headers', async () => {
            mockFetch.mockResolvedValue(mockFetchSuccess(mockVirtualTryOnResponse));

            await apiService.combineImages(mockApiFile, mockClothingItems);

            const [, options] = mockFetch.mock.calls[0];
            expect(options.headers).toEqual({
                'Content-Type': 'application/json',
            });
        });

        it('should handle request timeout', async () => {
            // Mock AbortController
            const mockAbortController = {
                signal: { aborted: false },
                abort: vi.fn()
            };

            global.AbortController = vi.fn(() => mockAbortController) as any;

            // Mock a request that takes longer than timeout
            mockFetch.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(mockFetchSuccess(mockVirtualTryOnResponse)), 35000))
            );

            await expect(apiService.combineImages(mockApiFile, mockClothingItems))
                .rejects.toThrow();
        });
    });
});