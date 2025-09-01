// Mock utilities for testing

// Mock Gemini AI service responses
export const mockGeminiResponse = {
    success: {
        response: {
            candidates: [{
                content: {
                    parts: [{
                        inlineData: {
                            data: 'base64-encoded-image-data',
                            mimeType: 'image/jpeg'
                        }
                    }]
                }
            }]
        }
    },
    error: {
        error: new Error('Gemini API error')
    }
};

// Mock Azure OpenAI service responses
export const mockAzureResponse = {
    success: {
        choices: [{
            message: {
                content: JSON.stringify({
                    recommendations: {
                        top: [
                            {
                                id: 'top-1',
                                title: 'Test Top Item',
                                price: 29.99,
                                imageUrl: 'https://example.com/top1.jpg',
                                score: 0.95,
                                tags: ['casual', 'cotton'],
                                category: 'top'
                            }
                        ],
                        pants: [
                            {
                                id: 'pants-1',
                                title: 'Test Pants Item',
                                price: 49.99,
                                imageUrl: 'https://example.com/pants1.jpg',
                                score: 0.88,
                                tags: ['denim', 'casual'],
                                category: 'pants'
                            }
                        ],
                        shoes: [],
                        accessories: []
                    }
                })
            }
        }]
    },
    error: {
        error: new Error('Azure OpenAI API error')
    }
};

// Mock catalog data
export const mockCatalogData = [
    {
        id: 'item-1',
        title: 'Test Item 1',
        price: 19.99,
        imageUrl: 'https://example.com/item1.jpg',
        tags: ['test', 'mock'],
        category: 'top'
    },
    {
        id: 'item-2',
        title: 'Test Item 2',
        price: 39.99,
        imageUrl: 'https://example.com/item2.jpg',
        tags: ['test', 'mock'],
        category: 'pants'
    }
];

// Mock request data
export const mockRequestData = {
    validVirtualTryOn: {
        person: {
            base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
            mimeType: 'image/jpeg'
        },
        clothingItems: {
            top: {
                base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
                mimeType: 'image/jpeg'
            }
        }
    },
    validRecommendation: {
        person: {
            base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
            mimeType: 'image/jpeg'
        }
    }
};

// Create mock functions for external services
export const createMockGeminiService = () => ({
    generateVirtualTryOnImage: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true)
});

export const createMockOpenAIService = () => ({
    generateRecommendations: jest.fn(),
    generateRecommendationsFromFitting: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true)
});

export const createMockCatalogService = () => ({
    searchProducts: jest.fn(),
    getProductsByCategory: jest.fn(),
    getAllProducts: jest.fn().mockReturnValue(mockCatalogData)
});

// Helper function to create mock Express request
export const createMockRequest = (body = {}, params = {}, query = {}) => ({
    body,
    params,
    query,
    headers: {},
    get: jest.fn()
});

// Helper function to create mock Express response
export const createMockResponse = () => {
    const res = {
        status: jest.fn(),
        json: jest.fn(),
        send: jest.fn(),
        end: jest.fn()
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    res.send.mockReturnValue(res);
    return res;
};

// Helper function to create mock Express next function
export const createMockNext = () => jest.fn();