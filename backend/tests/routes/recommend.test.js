// Tests for recommendation API routes
import { apiRequest, validateApiResponse, validateErrorResponse, createRecommendationPayload } from '../utils/testHelpers.js';
import { createMockOpenAIService, createMockCatalogService, mockAzureResponse } from '../utils/mocks.js';
import openaiService from '../../src/services/openai.service.js';
import catalogService from '../../src/services/catalog.service.js';

// Mock the services
jest.mock('../../src/services/openai.service.js');
jest.mock('../../src/services/catalog.service.js');

describe('POST /api/recommend', () => {
    let mockOpenAI;
    let mockCatalog;

    beforeEach(() => {
        mockOpenAI = createMockOpenAIService();
        mockCatalog = createMockCatalogService();
        Object.assign(openaiService, mockOpenAI);
        Object.assign(catalogService, mockCatalog);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Successful recommendations', () => {
        it('should generate recommendations with AI analysis', async () => {
            const payload = createRecommendationPayload();
            const mockStyleAnalysis = {
                detected_style: ['casual', 'street'],
                colors: ['black', 'white'],
                categories: ['top'],
                style_preference: ['casual', 'comfortable']
            };
            const mockRecommendations = {
                top: [{ id: 'top-1', title: 'Test Top', price: 29.99, category: 'top', tags: ['casual'] }],
                pants: [],
                shoes: [],
                accessories: []
            };

            mockOpenAI.isAvailable.mockReturnValue(true);
            mockOpenAI.analyzeStyleFromImages.mockResolvedValue(mockStyleAnalysis);
            mockCatalog.findSimilarProducts.mockReturnValue(mockRecommendations);

            const response = await apiRequest
                .post('/api/recommend')
                .send(payload);

            const body = validateApiResponse(response, 200);

            expect(body).toHaveProperty('recommendations', mockRecommendations);
            expect(body).toHaveProperty('analysisMethod', 'ai');
            expect(body).toHaveProperty('styleAnalysis', mockStyleAnalysis);
            expect(body).toHaveProperty('requestId');
            expect(body).toHaveProperty('timestamp');

            expect(mockOpenAI.analyzeStyleFromImages).toHaveBeenCalledWith(
                payload.person,
                payload.clothingItems || {}
            );
            expect(mockCatalog.findSimilarProducts).toHaveBeenCalledWith(
                mockStyleAnalysis,
                { maxPerCategory: 3, includeScore: false }
            );
        });

        it('should generate recommendations with fallback analysis when AI fails', async () => {
            const payload = createRecommendationPayload();
            const mockRecommendations = {
                top: [{ id: 'top-1', title: 'Test Top', price: 29.99, category: 'top', tags: ['casual'] }],
                pants: [],
                shoes: [],
                accessories: []
            };

            mockOpenAI.isAvailable.mockReturnValue(true);
            mockOpenAI.analyzeStyleFromImages.mockRejectedValue(new Error('AI service error'));
            mockCatalog.getRecommendationsByStyle.mockReturnValue([
                { id: 'top-1', title: 'Test Top', price: 29.99, category: 'top', tags: ['casual'] }
            ]);

            const response = await apiRequest
                .post('/api/recommend')
                .send(payload);

            const body = validateApiResponse(response, 200);

            expect(body).toHaveProperty('recommendations');
            expect(body).toHaveProperty('analysisMethod', 'fallback');
            expect(body).not.toHaveProperty('styleAnalysis');

            expect(mockCatalog.getRecommendationsByStyle).toHaveBeenCalled();
        });

        it('should generate recommendations when AI is not available', async () => {
            const payload = createRecommendationPayload();

            mockOpenAI.isAvailable.mockReturnValue(false);
            mockCatalog.getRecommendationsByStyle.mockReturnValue([
                { id: 'top-1', title: 'Test Top', price: 29.99, category: 'top', tags: ['casual'] }
            ]);

            const response = await apiRequest
                .post('/api/recommend')
                .send(payload);

            const body = validateApiResponse(response, 200);

            expect(body).toHaveProperty('recommendations');
            expect(body).toHaveProperty('analysisMethod', 'fallback');
            expect(body).not.toHaveProperty('styleAnalysis');

            expect(mockOpenAI.analyzeStyleFromImages).not.toHaveBeenCalled();
            expect(mockCatalog.getRecommendationsByStyle).toHaveBeenCalled();
        });

        it('should handle recommendation options', async () => {
            const payload = {
                ...createRecommendationPayload(),
                options: {
                    maxPerCategory: 5,
                    minPrice: 20,
                    maxPrice: 100,
                    excludeTags: ['expensive']
                }
            };

            mockOpenAI.isAvailable.mockReturnValue(true);
            mockOpenAI.analyzeStyleFromImages.mockResolvedValue({});
            mockCatalog.findSimilarProducts.mockReturnValue({
                top: [], pants: [], shoes: [], accessories: []
            });

            const response = await apiRequest
                .post('/api/recommend')
                .send(payload);

            validateApiResponse(response, 200);

            expect(mockCatalog.findSimilarProducts).toHaveBeenCalledWith(
                {},
                { maxPerCategory: 5, includeScore: false }
            );
        });
    });

    describe('Validation errors', () => {
        it('should return 400 when no input data provided', async () => {
            const payload = {};

            const response = await apiRequest
                .post('/api/recommend')
                .send(payload);

            const error = validateErrorResponse(response, 400);
            expect(error.message).toContain('required');
        });

        it('should return 400 for invalid image format', async () => {
            const payload = {
                person: {
                    base64: 'invalid-data',
                    mimeType: 'image/gif' // unsupported
                }
            };

            const response = await apiRequest
                .post('/api/recommend')
                .send(payload);

            const error = validateErrorResponse(response, 400);
            expect(error.message).toContain('format');
        });
    });
});

describe('POST /api/recommend/from-fitting', () => {
    let mockOpenAI;
    let mockCatalog;

    beforeEach(() => {
        mockOpenAI = createMockOpenAIService();
        mockCatalog = createMockCatalogService();
        Object.assign(openaiService, mockOpenAI);
        Object.assign(catalogService, mockCatalog);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Successful recommendations', () => {
        it('should generate recommendations from virtual try-on result', async () => {
            const payload = {
                generatedImage: 'data:image/jpeg;base64,generated-image-data',
                originalClothingItems: {
                    top: {
                        base64: 'top-image-data',
                        mimeType: 'image/jpeg'
                    }
                }
            };

            const mockClothingAnalysis = {
                top: ['black', 'hoodie', 'oversized'],
                overall_style: ['casual', 'street']
            };
            const mockRecommendations = {
                top: [{ id: 'top-1', title: 'Similar Top', price: 39.99, category: 'top', tags: ['casual'] }],
                pants: [],
                shoes: [],
                accessories: []
            };

            mockOpenAI.isAvailable.mockReturnValue(true);
            mockOpenAI.analyzeVirtualTryOnImage.mockResolvedValue(mockClothingAnalysis);
            mockCatalog.findSimilarProducts.mockReturnValue(mockRecommendations);

            const response = await apiRequest
                .post('/api/recommend/from-fitting')
                .send(payload);

            const body = validateApiResponse(response, 200);

            expect(body).toHaveProperty('recommendations', mockRecommendations);
            expect(body).toHaveProperty('analysisMethod', 'ai');
            expect(body).toHaveProperty('clothingAnalysis', mockClothingAnalysis);

            expect(mockOpenAI.analyzeVirtualTryOnImage).toHaveBeenCalledWith(
                'generated-image-data',
                'image/jpeg',
                payload.originalClothingItems
            );
        });

        it('should handle fallback when AI analysis fails', async () => {
            const payload = {
                generatedImage: 'data:image/jpeg;base64,generated-image-data'
            };

            mockOpenAI.isAvailable.mockReturnValue(true);
            mockOpenAI.analyzeVirtualTryOnImage.mockRejectedValue(new Error('AI error'));
            mockOpenAI.generateFallbackAnalysis.mockReturnValue({
                overall_style: ['casual']
            });
            mockCatalog.findSimilarProducts.mockReturnValue({
                top: [], pants: [], shoes: [], accessories: []
            });

            const response = await apiRequest
                .post('/api/recommend/from-fitting')
                .send(payload);

            const body = validateApiResponse(response, 200);

            expect(body).toHaveProperty('analysisMethod', 'fallback');
            expect(mockOpenAI.generateFallbackAnalysis).toHaveBeenCalled();
        });
    });

    describe('Validation errors', () => {
        it('should return 400 for missing generated image', async () => {
            const payload = {};

            const response = await apiRequest
                .post('/api/recommend/from-fitting')
                .send(payload);

            const error = validateErrorResponse(response, 400);
            expect(error.message).toContain('generatedImage');
        });

        it('should return 400 for invalid data URI format', async () => {
            const payload = {
                generatedImage: 'invalid-data-uri'
            };

            const response = await apiRequest
                .post('/api/recommend/from-fitting')
                .send(payload);

            const error = validateErrorResponse(response, 400);
            expect(error.message).toContain('format');
        });
    });
});

describe('GET /api/recommend/catalog', () => {
    let mockCatalog;

    beforeEach(() => {
        mockCatalog = createMockCatalogService();
        Object.assign(catalogService, mockCatalog);
    });

    it('should return catalog statistics', async () => {
        const mockStats = {
            totalProducts: 150,
            categories: {
                top: 45,
                pants: 35,
                shoes: 40,
                accessories: 30
            },
            priceRange: {
                min: 15000,
                max: 250000,
                average: 65000
            }
        };

        mockCatalog.getStatistics.mockReturnValue(mockStats);

        const response = await apiRequest
            .get('/api/recommend/catalog');

        const body = validateApiResponse(response, 200);
        expect(body).toEqual(mockStats);
    });
});

describe('GET /api/recommend/status', () => {
    let mockOpenAI;
    let mockCatalog;

    beforeEach(() => {
        mockOpenAI = createMockOpenAIService();
        mockCatalog = createMockCatalogService();
        Object.assign(openaiService, mockOpenAI);
        Object.assign(catalogService, mockCatalog);
    });

    it('should return service status', async () => {
        const mockAIConfig = {
            deploymentId: 'gpt-4-vision-preview',
            timeout: 30000,
            isConfigured: true
        };
        const mockCatalogStats = {
            totalProducts: 150
        };

        mockOpenAI.isAvailable.mockReturnValue(true);
        mockOpenAI.getConfig.mockReturnValue(mockAIConfig);
        mockCatalog.getStatistics.mockReturnValue(mockCatalogStats);

        const response = await apiRequest
            .get('/api/recommend/status');

        const body = validateApiResponse(response, 200);

        expect(body).toHaveProperty('aiService');
        expect(body.aiService).toHaveProperty('available', true);
        expect(body.aiService).toHaveProperty('config', mockAIConfig);
        expect(body).toHaveProperty('catalogService');
        expect(body.catalogService).toHaveProperty('available', true);
        expect(body.catalogService).toHaveProperty('productCount', 150);
    });
});