// Tests for Azure OpenAI service
import { jest } from '@jest/globals';
import { mockAzureResponse } from '../utils/mocks.js';

// Mock the OpenAI module
const mockChatCompletionsCreate = jest.fn();
const mockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
        completions: {
            create: mockChatCompletionsCreate
        }
    }
}));

jest.unstable_mockModule('openai', () => ({
    default: mockOpenAI
}));

// Import after mocking
const { default: OpenAIService } = await import('../../src/services/openai.service.js');

describe('OpenAIService', () => {
    let openaiService;
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv };
        openaiService = new OpenAIService();
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('isAvailable', () => {
        it('should return true when endpoint and API key are configured', () => {
            process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
            process.env.AZURE_OPENAI_KEY = 'test-api-key';
            openaiService = new OpenAIService();

            expect(openaiService.isAvailable()).toBe(true);
        });

        it('should return false when endpoint is missing', () => {
            delete process.env.AZURE_OPENAI_ENDPOINT;
            process.env.AZURE_OPENAI_KEY = 'test-api-key';
            openaiService = new OpenAIService();

            expect(openaiService.isAvailable()).toBe(false);
        });

        it('should return false when API key is missing', () => {
            process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
            delete process.env.AZURE_OPENAI_KEY;
            openaiService = new OpenAIService();

            expect(openaiService.isAvailable()).toBe(false);
        });
    });

    describe('analyzeStyleFromImages', () => {
        beforeEach(() => {
            process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
            process.env.AZURE_OPENAI_KEY = 'test-api-key';
            process.env.AZURE_OPENAI_DEPLOYMENT_ID = 'gpt-4-vision';
            openaiService = new OpenAIService();
        });

        it('should analyze style from person and clothing images', async () => {
            const person = {
                base64: 'person-base64-data',
                mimeType: 'image/jpeg'
            };
            const clothingItems = {
                top: {
                    base64: 'top-base64-data',
                    mimeType: 'image/jpeg'
                }
            };

            const mockAnalysis = {
                detected_style: ['casual', 'street'],
                colors: ['black', 'white'],
                categories: ['top'],
                style_preference: ['casual', 'comfortable']
            };

            mockChatCompletionsCreate.mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify(mockAnalysis)
                    }
                }]
            });

            const result = await openaiService.analyzeStyleFromImages(person, clothingItems);

            expect(result).toEqual(mockAnalysis);
            expect(mockOpenAI).toHaveBeenCalled();
            expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-4-vision',
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: 'user',
                            content: expect.arrayContaining([
                                expect.objectContaining({ type: 'text' }),
                                expect.objectContaining({ type: 'image_url' })
                            ])
                        })
                    ])
                })
            );
        });

        it('should handle only person image', async () => {
            const person = {
                base64: 'person-base64-data',
                mimeType: 'image/jpeg'
            };

            const mockAnalysis = {
                detected_style: ['casual'],
                colors: ['neutral'],
                categories: ['person'],
                style_preference: ['comfortable']
            };

            mockChatCompletionsCreate.mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify(mockAnalysis)
                    }
                }]
            });

            const result = await openaiService.analyzeStyleFromImages(person, {});

            expect(result).toEqual(mockAnalysis);
            expect(mockChatCompletionsCreate).toHaveBeenCalled();
        });

        it('should handle only clothing items', async () => {
            const clothingItems = {
                top: {
                    base64: 'top-base64-data',
                    mimeType: 'image/jpeg'
                },
                pants: {
                    base64: 'pants-base64-data',
                    mimeType: 'image/png'
                }
            };

            const mockAnalysis = {
                detected_style: ['casual'],
                colors: ['blue', 'black'],
                categories: ['top', 'pants'],
                style_preference: ['versatile']
            };

            mockChatCompletionsCreate.mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify(mockAnalysis)
                    }
                }]
            });

            const result = await openaiService.analyzeStyleFromImages(null, clothingItems);

            expect(result).toEqual(mockAnalysis);
            expect(mockChatCompletionsCreate).toHaveBeenCalled();
        });

        it('should throw error when no images provided', async () => {
            await expect(
                openaiService.analyzeStyleFromImages(null, {})
            ).rejects.toThrow('At least one image is required');
        });

        it('should handle API errors', async () => {
            const person = {
                base64: 'person-base64-data',
                mimeType: 'image/jpeg'
            };

            mockChatCompletionsCreate.mockRejectedValue(new Error('API rate limit exceeded'));

            await expect(
                openaiService.analyzeStyleFromImages(person, {})
            ).rejects.toThrow('API rate limit exceeded');
        });

        it('should handle invalid JSON response', async () => {
            const person = {
                base64: 'person-base64-data',
                mimeType: 'image/jpeg'
            };

            mockChatCompletionsCreate.mockResolvedValue({
                choices: [{
                    message: {
                        content: 'invalid json response'
                    }
                }]
            });

            await expect(
                openaiService.analyzeStyleFromImages(person, {})
            ).rejects.toThrow('Failed to parse style analysis');
        });
    });

    describe('analyzeVirtualTryOnImage', () => {
        beforeEach(() => {
            process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
            process.env.AZURE_OPENAI_KEY = 'test-api-key';
            openaiService = new OpenAIService();
        });

        it('should analyze virtual try-on image', async () => {
            const generatedImageBase64 = 'generated-image-data';
            const mimeType = 'image/jpeg';
            const originalClothingItems = {
                top: {
                    base64: 'top-base64-data',
                    mimeType: 'image/jpeg'
                }
            };

            const mockAnalysis = {
                top: ['black', 'hoodie', 'oversized'],
                overall_style: ['casual', 'street']
            };

            mockChatCompletionsCreate.mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify(mockAnalysis)
                    }
                }]
            });

            const result = await openaiService.analyzeVirtualTryOnImage(
                generatedImageBase64,
                mimeType,
                originalClothingItems
            );

            expect(result).toEqual(mockAnalysis);
            expect(mockChatCompletionsCreate).toHaveBeenCalled();
        });

        it('should handle missing original clothing items', async () => {
            const generatedImageBase64 = 'generated-image-data';
            const mimeType = 'image/jpeg';

            const mockAnalysis = {
                overall_style: ['casual']
            };

            mockChatCompletionsCreate.mockResolvedValue({
                choices: [{
                    message: {
                        content: JSON.stringify(mockAnalysis)
                    }
                }]
            });

            const result = await openaiService.analyzeVirtualTryOnImage(
                generatedImageBase64,
                mimeType,
                {}
            );

            expect(result).toEqual(mockAnalysis);
        });
    });

    describe('generateFallbackAnalysis', () => {
        it('should generate fallback analysis from clothing items', () => {
            const clothingItems = {
                top: { base64: 'top-data', mimeType: 'image/jpeg' },
                pants: { base64: 'pants-data', mimeType: 'image/png' }
            };

            const result = openaiService.generateFallbackAnalysis(clothingItems);

            expect(result).toEqual({
                top: ['casual', 'basic'],
                pants: ['casual', 'basic'],
                overall_style: ['casual', 'everyday']
            });
        });

        it('should handle empty clothing items', () => {
            const result = openaiService.generateFallbackAnalysis({});

            expect(result).toEqual({
                overall_style: ['casual', 'everyday']
            });
        });
    });

    describe('getConfig', () => {
        it('should return service configuration when available', () => {
            process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
            process.env.AZURE_OPENAI_KEY = 'test-api-key';
            process.env.AZURE_OPENAI_DEPLOYMENT_ID = 'gpt-4-vision';
            openaiService = new OpenAIService();

            const config = openaiService.getConfig();

            expect(config).toEqual({
                deploymentId: 'gpt-4-vision',
                timeout: 30000,
                maxRetries: 3,
                isConfigured: true
            });
        });

        it('should return configuration with isConfigured false when not available', () => {
            delete process.env.AZURE_OPENAI_ENDPOINT;
            delete process.env.AZURE_OPENAI_KEY;
            openaiService = new OpenAIService();

            const config = openaiService.getConfig();

            expect(config.isConfigured).toBe(false);
        });
    });
});