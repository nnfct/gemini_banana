// Tests for error handling middleware
import { createMockRequest, createMockResponse, createMockNext } from '../utils/mocks.js';

// Import the middleware after setting up mocks
const { ApiError, ApiErrors, asyncHandler, errorHandler } = await import('../../src/middleware/error.js');

describe('ApiError', () => {
    it('should create ApiError with default values', () => {
        const error = new ApiError('Test error');

        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(error.details).toBeUndefined();
    });

    it('should create ApiError with custom values', () => {
        const details = { field: 'email' };
        const error = new ApiError('Validation failed', 400, 'VALIDATION_ERROR', details);

        expect(error.message).toBe('Validation failed');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toEqual(details);
    });
});

describe('ApiErrors factory', () => {
    it('should create badRequest error', () => {
        const error = ApiErrors.badRequest('Invalid input');

        expect(error).toBeInstanceOf(ApiError);
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('BAD_REQUEST');
        expect(error.message).toBe('Invalid input');
    });

    it('should create unauthorized error', () => {
        const error = ApiErrors.unauthorized('Access denied');

        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('UNAUTHORIZED');
        expect(error.message).toBe('Access denied');
    });

    it('should create notFound error', () => {
        const error = ApiErrors.notFound('Resource not found');

        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe('Resource not found');
    });

    it('should create tooManyRequests error', () => {
        const error = ApiErrors.tooManyRequests('Rate limit exceeded');

        expect(error.statusCode).toBe(429);
        expect(error.code).toBe('TOO_MANY_REQUESTS');
        expect(error.message).toBe('Rate limit exceeded');
    });

    it('should create internalServer error', () => {
        const error = ApiErrors.internalServer('Server error');

        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(error.message).toBe('Server error');
    });

    it('should create serviceUnavailable error', () => {
        const error = ApiErrors.serviceUnavailable('Service down');

        expect(error.statusCode).toBe(503);
        expect(error.code).toBe('SERVICE_UNAVAILABLE');
        expect(error.message).toBe('Service down');
    });

    it('should create gatewayTimeout error', () => {
        const error = ApiErrors.gatewayTimeout('Request timeout');

        expect(error.statusCode).toBe(504);
        expect(error.code).toBe('GATEWAY_TIMEOUT');
        expect(error.message).toBe('Request timeout');
    });
});

describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
        const mockFn = jest.fn().mockResolvedValue('success');
        const wrappedFn = asyncHandler(mockFn);
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        await wrappedFn(req, res, next);

        expect(mockFn).toHaveBeenCalledWith(req, res, next);
        expect(next).not.toHaveBeenCalled();
    });

    it('should handle async function that throws error', async () => {
        const error = new Error('Async error');
        const mockFn = jest.fn().mockRejectedValue(error);
        const wrappedFn = asyncHandler(mockFn);
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        await wrappedFn(req, res, next);

        expect(mockFn).toHaveBeenCalledWith(req, res, next);
        expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle sync function that throws error', async () => {
        const error = new Error('Sync error');
        const mockFn = jest.fn().mockImplementation(() => {
            throw error;
        });
        const wrappedFn = asyncHandler(mockFn);
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        await wrappedFn(req, res, next);

        expect(mockFn).toHaveBeenCalledWith(req, res, next);
        expect(next).toHaveBeenCalledWith(error);
    });
});

describe('errorHandler middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = createMockRequest();
        res = createMockResponse();
        next = createMockNext();
    });

    it('should handle ApiError correctly', () => {
        const error = new ApiError('Test error', 400, 'TEST_ERROR', { field: 'test' });

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                message: 'Test error',
                code: 'TEST_ERROR',
                field: 'test'
            }
        });
    });

    it('should handle generic Error as internal server error', () => {
        const error = new Error('Generic error');

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                message: 'Generic error',
                code: 'INTERNAL_SERVER_ERROR'
            }
        });
    });

    it('should include stack trace in development environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const error = new Error('Dev error');
        error.stack = 'Error stack trace';

        errorHandler(error, req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            error: {
                message: 'Dev error',
                code: 'INTERNAL_SERVER_ERROR',
                stack: 'Error stack trace'
            }
        });

        process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const error = new Error('Prod error');
        error.stack = 'Error stack trace';

        errorHandler(error, req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            error: {
                message: 'Prod error',
                code: 'INTERNAL_SERVER_ERROR'
            }
        });

        process.env.NODE_ENV = originalEnv;
    });

    it('should handle error without message', () => {
        const error = new Error();

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                message: 'An unexpected error occurred',
                code: 'INTERNAL_SERVER_ERROR'
            }
        });
    });

    it('should log error in development mode', () => {
        const originalEnv = process.env.NODE_ENV;
        const originalConsole = console.error;
        process.env.NODE_ENV = 'development';
        console.error = jest.fn();

        const error = new ApiError('Test error', 400);

        errorHandler(error, req, res, next);

        expect(console.error).toHaveBeenCalled();

        process.env.NODE_ENV = originalEnv;
        console.error = originalConsole;
    });
});