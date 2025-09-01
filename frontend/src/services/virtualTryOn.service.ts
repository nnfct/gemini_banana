import { apiClient, ApiError } from './api.service';
import {
    VirtualTryOnRequest,
    VirtualTryOnResponse,
    RecommendationRequest,
    RecommendationResponse
} from '../types';

/**
 * Virtual Try-On API Service
 * Provides typed methods for virtual try-on and recommendation API calls
 */
export class VirtualTryOnService {
    /**
     * Generate virtual try-on image by combining person and clothing items
     * @param request - Virtual try-on request with person image and clothing items
     * @returns Promise resolving to generated image data
     */
    async combineImages(request: VirtualTryOnRequest): Promise<VirtualTryOnResponse> {
        try {
            const response = await apiClient.post<VirtualTryOnResponse>(
                '/api/generate',
                request,
                {
                    timeout: 60000, // Extended timeout for AI processing
                }
            );

            if (response.error) {
                throw new ApiError(response.error, 400, 'GENERATION_ERROR');
            }

            return response;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(
                'Failed to generate virtual try-on image',
                500,
                'GENERATION_FAILED'
            );
        }
    }

    /**
     * Get product recommendations based on uploaded images
     * @param request - Recommendation request with person and/or clothing items
     * @returns Promise resolving to product recommendations
     */
    async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
        try {
            const response = await apiClient.post<RecommendationResponse>(
                '/api/recommend',
                request,
                {
                    timeout: 45000, // Extended timeout for AI processing
                }
            );

            if (response.error) {
                throw new ApiError(response.error, 400, 'RECOMMENDATION_ERROR');
            }

            return response;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(
                'Failed to get recommendations',
                500,
                'RECOMMENDATION_FAILED'
            );
        }
    }

    /**
     * Get product recommendations based on virtual try-on result
     * @param request - Recommendation request with generated image
     * @returns Promise resolving to product recommendations
     */
    async getRecommendationsFromFitting(request: RecommendationRequest): Promise<RecommendationResponse> {
        try {
            const response = await apiClient.post<RecommendationResponse>(
                '/api/recommend/from-fitting',
                request,
                {
                    timeout: 45000, // Extended timeout for AI processing
                }
            );

            if (response.error) {
                throw new ApiError(response.error, 400, 'RECOMMENDATION_ERROR');
            }

            return response;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(
                'Failed to get recommendations from fitting',
                500,
                'RECOMMENDATION_FAILED'
            );
        }
    }

    /**
     * Check if virtual try-on generation is currently loading
     */
    isGenerating(): boolean {
        return apiClient.isLoading('POST', '/api/generate');
    }

    /**
     * Check if recommendations are currently loading
     */
    isLoadingRecommendations(): boolean {
        return apiClient.isLoading('POST', '/api/recommend') ||
            apiClient.isLoading('POST', '/api/recommend/from-fitting');
    }

    /**
     * Check if any API call is currently loading
     */
    isLoading(): boolean {
        return this.isGenerating() || this.isLoadingRecommendations();
    }
}

// Create and export singleton instance
export const virtualTryOnService = new VirtualTryOnService();