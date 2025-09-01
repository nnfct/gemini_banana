// Tests for virtual try-on generation API routes
import { apiRequest, validateApiResponse, validateErrorResponse, createVirtualTryOnPayload } from '../utils/testHelpers.js';
import { createMockGeminiService } from '../utils/mocks.js';
import geminiService from '../../src/services/gemini.service.js';

// Mock the Gemini service
jest.mock('../../src/services/gemini.service.js');

describe('POST /api/generate', () => {
    let mockGemini;

    beforeEach(() => {
        mockGemini = createMockGeminiService();
        Object.assign(geminiService, mockGemini);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Successful generation', () => {
        it('should generate virtual try-on image with valid input', async () => {
            const payload = createVirtualTryOnPayload();
            const expectedImage = 'data:image/jpeg;base64,generated-image-data';

            mockGemini.isAvailable.mockReturnValue(true);
            mockGemini.generateVirtualTryOnImage.mockResolvedValue(expectedImage);

            const response = await apiRequest
                .post('/api/generate')
                .send(payload);

            const body = validateApiResponse(response, 200);

            expect(body).toHaveProperty('generatedImage', expectedImage);
            expect(body).toHaveProperty('requestId');
            expect(body).toHaveProperty('timestamp');
            expect(mockGemini.generateVirtualTryOnImage).toHaveBeenCalledWith(
                payload.person,
                payload.clothingItems
            );
        });

        it('should handle multiple clothing items', async () => {
            const payload = {
                person: {
                    base64: 'person-image-data',
                    mimeType: 'image/jpeg'
                },
                clothingItems: {
                    top: {
                        base64: 'top-image-data',
                        mimeType: 'image/jpeg'
                    },
                    pants: {
                        base64: 'pants-image-data',
                        mimeType: 'image/png'
                    },
                    shoes: {
                        base64: 'shoes-image-data',
                        mimeType: 'image/webp'
                    }
                }
            };

            mockGemini.isAvailable.mockReturnValue(true);
            mockGemini.generateVirtualTryOnImage.mockResolvedValue('data:image/jpeg;base64,result');

            const response = await apiRequest
                .post('/api/generate')
                .send(payload);

            validateApiResponse(response, 200);
            expect(mockGemini.generateVirtualTryOnImage).toHaveBeenCalledWith(
                payload.person,
                payload.clothingItems
            );
        });
    });

    describe('Validation errors', () => {
        it('should return 400 for missing person image', async () => {
            const payload = {
                clothingItems: {
                    top: {
                        base64: 'top-image-data',
                        mimeType: 'image/jpeg'
                    }
                }
            };

            const response = await apiRequest
                .post('/api/generate')
                .send(payload);

            const error = validateErrorResponse(response, 400);
            expect(error.message).toContain('person');
            expect(error.code).toBe('MISSING_REQUIRED_FIELDS');
        });

        it('should return 400 for missing clothing items', async () => {
            const payload = {
                person: {
                    base64: 'person-image-data',
                    mimeType: 'image/jpeg'
                }
            };

            const response = await apiRequest
                .post('/api/generate')
                .send(payload);

            const error = validateErrorResponse(response, 400);
            expect(error.message).toContain('clothingItems');
        });

        it('should return 400 for invalid image format', async () => {
            const payload = {
                person: {
                    base64: 'invalid-base64-data',
                    mimeType: 'image/gif' // unsupported format
                },
                clothingItems: {
                    top: {
                        base64: 'top-image-data',
                        mimeType: 'image/jpeg'
                    }
                }
            };

            const response = await apiRequest
                .post('/api/generate')
                .send(payload);

            const error = validateErrorResponse(response, 400);
            expect(error.message).toContain('format');
        });

        it('should return 400 for missing base64 data', async () => {
            const payload = {
                person: {
                    mimeType: 'image/jpeg'
                    // missing base64
                },
                clothingItems: {
                    top: {
                        base64: 'top-image-data',
                        mimeType: 'image/jpeg'
                    }
                }
            };

            const response = await apiRequest
                .post('/api/generate')
                .send(payload);

            const error = validateErrorResponse(response, 400);
            expect(error.message).toContain('base64');
        });
    });

    describe('Service errors', () => {
        it('should return 503 when Gemini service is not available', async () => {
            const payload = createVirtualTryOnPayload();

            mockGemini.isAvailable.mockReturnValue(false);

            const response = await apiRequest
                .post('/api/generate')
                .send(payload);

            const error = validateErrorResponse(response, 503);
            expect(error.message).toContain('not available');
            expect(error.code).toBe('SERVICE_UNAVAILABLE');
        });

        it('should return 500 when Gemini service fails', async () => {
            const payload = createVirtualTryOnPayload();

            mockGemini.isAvailable.mockReturnValue(true);
            mockGemini.generateVirtualTryOnImage.mockRejectedValue(new Error('API error'));

            const response = await apiRequest
                .post('/api/generate')
                .send(payload);

            const error = validateErrorResponse(response, 500);
            expect(error.message).toContain('generation failed');
            expect(error.code).toBe('INTERNAL_SERVER_ERROR');
        });

        it('should return 429 for rate limit errors', async () => {
            const payload = createVirtualTryOnPayload();

            mockGemini.isAvailable.mockReturnValue(true);
            mockGemini.generateVirtualTryOnImage.mockRejectedValue(new Error('rate limit exceeded'));

            const response = await apiRequest
                .post('/api/generate')
                .send(payload);

            const error = validateErrorResponse(response, 429);
            expect(error.message).toContain('rate limit');
            expect(error.code).toBe('TOO_MANY_REQUESTS');
        });

        it('should return 504 for timeout errors', async () => {
            const payload = createVirtualTryOnPayload();

            mockGemini.isAvailable.mockReturnValue(true);
            mockGemini.generateVirtualTryOnImage.mockRejectedValue(new Error('timeout'));

            const response = await apiRequest
                .post('/api/generate')
                .send(payload);

            const error = validateErrorResponse(response, 504);
            expect(error.message).toContain('timeout');
            expect(error.code).toBe('GATEWAY_TIMEOUT');
        });
    });
});

describe('GET /api/generate/status', () => {
    let mockGemini;

    beforeEach(() => {
        mockGemini = createMockGeminiService();
        Object.assign(geminiService, mockGemini);
    });

    it('should return service status when available', async () => {
        const mockConfig = {
            model: 'gemini-2.5-flash-image-preview',
            timeout: 30000,
            maxRetries: 3,
            isConfigured: true
        };

        mockGemini.isAvailable.mockReturnValue(true);
        mockGemini.getConfig.mockReturnValue(mockConfig);

        const response = await apiRequest
            .get('/api/generate/status');

        const body = validateApiResponse(response, 200);

        expect(body).toHaveProperty('available', true);
        expect(body).toHaveProperty('config', mockConfig);
    });

    it('should return service status when unavailable', async () => {
        const mockConfig = {
            model: 'gemini-2.5-flash-image-preview',
            timeout: 30000,
            maxRetries: 3,
            isConfigured: false
        };

        mockGemini.isAvailable.mockReturnValue(false);
        mockGemini.getConfig.mockReturnValue(mockConfig);

        const response = await apiRequest
            .get('/api/generate/status');

        const body = validateApiResponse(response, 200);

        expect(body).toHaveProperty('available', false);
        expect(body).toHaveProperty('config', mockConfig);
    });
});