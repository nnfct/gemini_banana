// Tests for Gemini AI service
import { jest } from '@jest/globals';
import { mockGeminiResponse, mockRequestData } from '../utils/mocks.js';

// Mock the Google GenAI module
const mockGenerateContent = jest.fn();
const mockGoogleGenAI = jest.fn().mockImplementation(() => ({
    generateContent: mockGenerateContent
}));

jest.unstable_mockModule('@google/genai', () => ({
    GoogleGenAI: mockGoogleGenAI,
    Modality: {
        IMAGE: 'image'
    }
}));

// Import after mocking
const { default: GeminiService } = await import('../../src/services/gemini.service.js');

describe('GeminiService', () => {
    let geminiService;
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv };
        geminiService = new GeminiService();
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('isAvailable', () => {
        it('should return true when API key is configured', () => {
            process.env.GEMINI_API_KEY = 'test-api-key';
            geminiService = new GeminiService();

            expect(geminiService.isAvailable()).toBe(true);
        });

        it('should return false when API key is not configured', () => {
            delete process.env.GEMINI_API_KEY;
            delete process.env.API_KEY;
            geminiService = new GeminiService();

            expect(geminiService.isAvailable()).toBe(false);
        });

        it('should use API_KEY as fallback', () => {
            delete process.env.GEMINI_API_KEY;
            process.env.API_KEY = 'fallback-api-key';
            geminiService = new GeminiService();

            expect(geminiService.isAvailable()).toBe(true);
        });
    });

    describe('generateVirtualTryOnImage', () => {
        beforeEach(() => {
            process.env.GEMINI_API_KEY = 'test-api-key';
            geminiService = new GeminiService();
        });

        it('should generate virtual try-on image successfully', async () => {
            const { person, clothingItems } = mockRequestData.validVirtualTryOn;

            mockGenerateContent.mockResolvedValue(mockGeminiResponse.success);

            const result = await geminiService.generateVirtualTryOnImage(person, clothingItems);

            expect(result).toBe('data:image/jpeg;base64,base64-encoded-image-data');
            expect(mockGoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
            expect(mockGenerateContent).toHaveBeenCalled();
        });

        it('should throw error for missing person data', async () => {
            await expect(
                geminiService.generateVirtualTryOnImage(null, {})
            ).rejects.toThrow('Person image data is required');
        });

        it('should throw error for missing person base64', async () => {
            const invalidPerson = { mimeType: 'image/jpeg' };

            await expect(
                geminiService.generateVirtualTryOnImage(invalidPerson, {})
            ).rejects.toThrow('Person image data is required');
        });

        it('should throw error for missing person mimeType', async () => {
            const invalidPerson = { base64: 'base64-data' };

            await expect(
                geminiService.generateVirtualTryOnImage(invalidPerson, {})
            ).rejects.toThrow('Person image data is required');
        });

        it('should handle empty clothing items', async () => {
            const { person } = mockRequestData.validVirtualTryOn;

            mockGenerateContent.mockResolvedValue(mockGeminiResponse.success);

            const result = await geminiService.generateVirtualTryOnImage(person, {});

            expect(result).toBe('data:image/jpeg;base64,base64-encoded-image-data');
            expect(mockGenerateContent).toHaveBeenCalled();
        });

        it('should handle API errors gracefully', async () => {
            const { person, clothingItems } = mockRequestData.validVirtualTryOn;

            mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

            await expect(
                geminiService.generateVirtualTryOnImage(person, clothingItems)
            ).rejects.toThrow('API quota exceeded');
        });

        it('should handle missing response data', async () => {
            const { person, clothingItems } = mockRequestData.validVirtualTryOn;

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: []
                }
            });

            const result = await geminiService.generateVirtualTryOnImage(person, clothingItems);

            expect(result).toBeNull();
        });

        it('should handle malformed response', async () => {
            const { person, clothingItems } = mockRequestData.validVirtualTryOn;

            mockGenerateContent.mockResolvedValue({
                response: {
                    candidates: [{
                        content: {
                            parts: []
                        }
                    }]
                }
            });

            const result = await geminiService.generateVirtualTryOnImage(person, clothingItems);

            expect(result).toBeNull();
        });
    });

    describe('getConfig', () => {
        it('should return service configuration', () => {
            process.env.GEMINI_API_KEY = 'test-api-key';
            geminiService = new GeminiService();

            const config = geminiService.getConfig();

            expect(config).toEqual({
                model: 'gemini-2.5-flash-image-preview',
                timeout: 30000,
                maxRetries: 3,
                isConfigured: true
            });
        });

        it('should return configuration with isConfigured false when not configured', () => {
            delete process.env.GEMINI_API_KEY;
            delete process.env.API_KEY;
            geminiService = new GeminiService();

            const config = geminiService.getConfig();

            expect(config.isConfigured).toBe(false);
        });
    });

    describe('_initializeClient', () => {
        it('should initialize client when API key is available', () => {
            process.env.GEMINI_API_KEY = 'test-api-key';
            geminiService = new GeminiService();

            const client = geminiService._initializeClient();

            expect(client).toBeDefined();
            expect(mockGoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
        });

        it('should not initialize client when API key is missing', () => {
            delete process.env.GEMINI_API_KEY;
            delete process.env.API_KEY;
            geminiService = new GeminiService();

            const client = geminiService._initializeClient();

            expect(client).toBeNull();
            expect(mockGoogleGenAI).not.toHaveBeenCalled();
        });

        it('should reuse existing client', () => {
            process.env.GEMINI_API_KEY = 'test-api-key';
            geminiService = new GeminiService();

            const client1 = geminiService._initializeClient();
            const client2 = geminiService._initializeClient();

            expect(client1).toBe(client2);
            expect(mockGoogleGenAI).toHaveBeenCalledTimes(1);
        });
    });
});