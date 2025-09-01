// Export all services and their types
export { apiClient, ApiError } from './api.service';
export type { RequestInterceptor, ResponseInterceptor, RequestConfig } from './api.service';

export { virtualTryOnService, VirtualTryOnService } from './virtualTryOn.service';

// Re-export types for convenience
export type {
    VirtualTryOnRequest,
    VirtualTryOnResponse,
    RecommendationRequest,
    RecommendationResponse,
    ApiFile,
    ClothingItems,
    RecommendationItem,
    CategoryRecommendations,
    UploadedImage,
    VirtualTryOnState
} from '../types';