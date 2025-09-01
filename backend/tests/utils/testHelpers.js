// Test helper utilities
import request from 'supertest';
import app from '../../src/app.js';

// Helper to make API requests during testing
export const apiRequest = request(app);

// Helper to create base64 test image
export const createTestImage = (width = 100, height = 100) => {
    // Simple 1x1 pixel JPEG in base64
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
};

// Helper to validate API response structure
export const validateApiResponse = (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.headers['content-type']).toMatch(/json/);
    return response.body;
};

// Helper to validate error response structure
export const validateErrorResponse = (response, expectedStatus = 400) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('message');
    expect(response.body.error).toHaveProperty('code');
    return response.body.error;
};

// Helper to create valid request payload for virtual try-on
export const createVirtualTryOnPayload = () => ({
    person: {
        base64: createTestImage(),
        mimeType: 'image/jpeg'
    },
    clothingItems: {
        top: {
            base64: createTestImage(),
            mimeType: 'image/jpeg'
        }
    }
});

// Helper to create valid request payload for recommendations
export const createRecommendationPayload = () => ({
    person: {
        base64: createTestImage(),
        mimeType: 'image/jpeg'
    }
});

// Helper to wait for async operations
export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to suppress console output during tests
export const suppressConsole = () => {
    const originalConsole = console;
    beforeEach(() => {
        global.console = {
            ...originalConsole,
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
        };
    });

    afterEach(() => {
        global.console = originalConsole;
    });
};

// Helper to test async error handling
export const expectAsyncError = async (asyncFn, expectedError) => {
    try {
        await asyncFn();
        throw new Error('Expected function to throw an error');
    } catch (error) {
        if (expectedError instanceof RegExp) {
            expect(error.message).toMatch(expectedError);
        } else if (typeof expectedError === 'string') {
            expect(error.message).toContain(expectedError);
        } else {
            expect(error).toEqual(expectedError);
        }
    }
};