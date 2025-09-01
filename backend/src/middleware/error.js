import config from '../utils/config.js';

/**
 * Standardized error handling middleware
 * Provides consistent error responses and logging
 */

/**
 * Custom API error class for structured error handling
 */
export class ApiError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Creates common API errors
 */
export const ApiErrors = {
    badRequest: (message = 'Bad Request', details = null) =>
        new ApiError(message, 400, 'BAD_REQUEST', details),

    unauthorized: (message = 'Unauthorized') =>
        new ApiError(message, 401, 'UNAUTHORIZED'),

    forbidden: (message = 'Forbidden') =>
        new ApiError(message, 403, 'FORBIDDEN'),

    notFound: (message = 'Not Found') =>
        new ApiError(message, 404, 'NOT_FOUND'),

    methodNotAllowed: (message = 'Method Not Allowed') =>
        new ApiError(message, 405, 'METHOD_NOT_ALLOWED'),

    conflict: (message = 'Conflict') =>
        new ApiError(message, 409, 'CONFLICT'),

    unprocessableEntity: (message = 'Unprocessable Entity', details = null) =>
        new ApiError(message, 422, 'UNPROCESSABLE_ENTITY', details),

    tooManyRequests: (message = 'Too Many Requests') =>
        new ApiError(message, 429, 'TOO_MANY_REQUESTS'),

    internalServer: (message = 'Internal Server Error') =>
        new ApiError(message, 500, 'INTERNAL_SERVER_ERROR'),

    badGateway: (message = 'Bad Gateway') =>
        new ApiError(message, 502, 'BAD_GATEWAY'),

    serviceUnavailable: (message = 'Service Unavailable') =>
        new ApiError(message, 503, 'SERVICE_UNAVAILABLE'),

    gatewayTimeout: (message = 'Gateway Timeout') =>
        new ApiError(message, 504, 'GATEWAY_TIMEOUT')
};

/**
 * Logs error details based on severity and environment
 * @param {Error} error - Error object to log
 * @param {express.Request} req - Express request object
 */
function logError(error, req) {
    const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        error: {
            name: error.name,
            message: error.message,
            code: error.code,
            statusCode: error.statusCode
        }
    };

    // Add stack trace in development
    if (config.server.nodeEnv === 'development') {
        logData.error.stack = error.stack;
    }

    // Add request body for debugging (excluding sensitive data)
    if (config.server.nodeEnv === 'development' && req.body) {
        const sanitizedBody = { ...req.body };
        // Remove sensitive fields
        delete sanitizedBody.password;
        delete sanitizedBody.token;
        delete sanitizedBody.apiKey;
        logData.requestBody = sanitizedBody;
    }

    // Log based on error severity
    if (error.statusCode >= 500) {
        console.error('🔥 Server Error:', JSON.stringify(logData, null, 2));
    } else if (error.statusCode >= 400) {
        console.warn('⚠️  Client Error:', JSON.stringify(logData, null, 2));
    } else {
        console.info('ℹ️  Info:', JSON.stringify(logData, null, 2));
    }
}

/**
 * Main error handling middleware
 * Should be the last middleware in the chain
 * @param {Error} err - Error object
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {Function} next - Express next function
 */
export function errorHandler(err, req, res, next) {
    // If response was already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    let error = err;

    // Convert non-ApiError instances to ApiError
    if (!(error instanceof ApiError)) {
        // Handle validation errors
        if (error.name === 'ValidationError') {
            error = new ApiError(
                error.message,
                error.statusCode || 400,
                error.code || 'VALIDATION_ERROR',
                { field: error.field }
            );
        }
        // Handle JSON parsing errors
        else if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
            error = new ApiError(
                'Invalid JSON in request body',
                400,
                'INVALID_JSON'
            );
        }
        // Handle other known error types
        else if (error.name === 'CastError') {
            error = new ApiError(
                'Invalid data format',
                400,
                'INVALID_DATA_FORMAT'
            );
        }
        // Handle CORS errors
        else if (error.message && error.message.includes('CORS')) {
            error = new ApiError(
                'CORS policy violation',
                403,
                'CORS_ERROR'
            );
        }
        // Default to internal server error
        else {
            error = new ApiError(
                config.server.nodeEnv === 'development' ? error.message : 'Internal Server Error',
                500,
                'INTERNAL_SERVER_ERROR'
            );
        }
    }

    // Log the error
    logError(error, req);

    // Prepare error response
    const errorResponse = {
        error: {
            message: error.message,
            code: error.code,
            timestamp: error.timestamp || new Date().toISOString()
        }
    };

    // Add additional details in development
    if (config.server.nodeEnv === 'development') {
        errorResponse.error.stack = error.stack;
        if (error.details) {
            errorResponse.error.details = error.details;
        }
    }

    // Add request ID if available
    if (req.id) {
        errorResponse.error.requestId = req.id;
    }

    // Send error response
    res.status(error.statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * Should be placed after all routes but before error handler
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {Function} next - Express next function
 */
export function notFoundHandler(req, res, next) {
    const error = new ApiError(
        `Route ${req.method} ${req.url} not found`,
        404,
        'ROUTE_NOT_FOUND'
    );
    next(error);
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Request timeout middleware
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Function} Express middleware function
 */
export function requestTimeout(timeout = 30000) {
    return (req, res, next) => {
        const timeoutId = setTimeout(() => {
            if (!res.headersSent) {
                const error = new ApiError(
                    'Request timeout',
                    408,
                    'REQUEST_TIMEOUT'
                );
                next(error);
            }
        }, timeout);

        // Clear timeout when response is finished
        res.on('finish', () => {
            clearTimeout(timeoutId);
        });

        next();
    };
}