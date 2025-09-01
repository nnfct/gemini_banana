// Mock utilities for API services and external dependencies
import { vi } from 'vitest';
import type { VirtualTryOnResponse, RecommendationResponse, ApiFile, ClothingItems } from '../types';

// Mock API service
export const createMockApiService = () => ({
    combineImages: vi.fn(),
    getRecommendations: vi.fn(),
    getRecommendationsFromFitting: vi.fn(),
    checkHealth: vi.fn()
});

// Mock successful API responses
export const mockVirtualTryOnResponse: VirtualTryOnResponse = {
    generatedImage: 'data:image/jpeg;base64,generated-image-data',
    requestId: 'req_123456',
    timestamp: '2024-01-15T10:30:00.000Z'
};

export const mockRecommendationResponse: RecommendationResponse = {
    recommendations: {
        top: [
            {
                id: 'top-1',
                title: 'Casual T-Shirt',
                price: 29.99,
                imageUrl: 'https://example.com/top1.jpg',
                tags: ['casual', 'cotton'],
                category: 'top'
            }
        ],
        pants: [
            {
                id: 'pants-1',
                title: 'Casual Jeans',
                price: 79.99,
                imageUrl: 'https://example.com/pants1.jpg',
                tags: ['casual', 'denim'],
                category: 'pants'
            }
        ],
        shoes: [],
        accessories: []
    },
    analysisMethod: 'ai',
    styleAnalysis: {
        detected_style: ['casual', 'street'],
        colors: ['black', 'white'],
        categories: ['top'],
        style_preference: ['casual', 'comfortable']
    },
    requestId: 'req_123456',
    timestamp: '2024-01-15T10:30:00.000Z'
};

// Mock error responses
export const mockApiError = {
    message: 'API request failed',
    status: 500,
    code: 'INTERNAL_SERVER_ERROR'
};

export const mockValidationError = {
    message: 'Validation failed',
    status: 400,
    code: 'VALIDATION_ERROR'
};

// Mock file data
export const mockApiFile: ApiFile = {
    base64: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    mimeType: 'image/jpeg'
};

export const mockClothingItems: ClothingItems = {
    top: mockApiFile,
    pants: null,
    shoes: null
};

// Mock fetch responses
export const mockFetchSuccess = (data: any, status = 200) => {
    return Promise.resolve({
        ok: true,
        status,
        json: () => Promise.resolve(data),
        headers: new Headers({
            'content-type': 'application/json'
        })
    } as Response);
};

export const mockFetchError = (status = 500, message = 'Server Error') => {
    return Promise.resolve({
        ok: false,
        status,
        json: () => Promise.resolve({
            error: {
                message,
                code: status === 400 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR'
            }
        }),
        headers: new Headers({
            'content-type': 'application/json'
        })
    } as Response);
};

export const mockFetchNetworkError = () => {
    return Promise.reject(new Error('Network error'));
};

// Mock localStorage
export const mockLocalStorage = () => {
    const store: Record<string, string> = {};

    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            Object.keys(store).forEach(key => delete store[key]);
        }),
        length: 0,
        key: vi.fn()
    };
};

// Mock URL.createObjectURL and URL.revokeObjectURL
export const mockURL = () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
};

// Mock FileReader
export const mockFileReader = (result: string) => {
    const mockReader = {
        readAsDataURL: vi.fn(),
        result,
        onload: null as ((event: any) => void) | null,
        onerror: null as ((event: any) => void) | null,
        onabort: null as ((event: any) => void) | null,
        readyState: 2, // DONE
        error: null
    };

    mockReader.readAsDataURL.mockImplementation(() => {
        setTimeout(() => {
            if (mockReader.onload) {
                mockReader.onload({ target: mockReader });
            }
        }, 0);
    });

    global.FileReader = vi.fn(() => mockReader) as any;
    return mockReader;
};

// Mock canvas and image processing
export const mockCanvas = () => {
    const mockContext = {
        drawImage: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        arc: vi.fn(),
        rect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        translate: vi.fn(),
        transform: vi.fn(),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),
        toDataURL: vi.fn(() => 'data:image/png;base64,mock-canvas-data')
    };

    const mockCanvas = {
        getContext: vi.fn(() => mockContext),
        width: 800,
        height: 600,
        toDataURL: vi.fn(() => 'data:image/png;base64,mock-canvas-data'),
        toBlob: vi.fn((callback) => {
            const blob = new Blob(['mock'], { type: 'image/png' });
            callback(blob);
        })
    };

    global.HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);
    global.HTMLCanvasElement.prototype.toDataURL = mockCanvas.toDataURL;
    global.HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob;

    return { mockCanvas, mockContext };
};

// Mock Image constructor
export const mockImage = () => {
    const mockImg = {
        src: '',
        onload: null as ((event: any) => void) | null,
        onerror: null as ((event: any) => void) | null,
        width: 800,
        height: 600,
        naturalWidth: 800,
        naturalHeight: 600,
        complete: true
    };

    global.Image = vi.fn(() => mockImg) as any;

    // Simulate image loading
    Object.defineProperty(mockImg, 'src', {
        set: (value: string) => {
            setTimeout(() => {
                if (mockImg.onload) {
                    mockImg.onload({} as any);
                }
            }, 0);
        }
    });

    return mockImg;
};