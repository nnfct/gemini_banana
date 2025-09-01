import { ApiError } from '../services';

/**
 * Error types for different categories of errors
 */
export enum ErrorType {
    NETWORK = 'NETWORK',
    VALIDATION = 'VALIDATION',
    AUTHENTICATION = 'AUTHENTICATION',
    AUTHORIZATION = 'AUTHORIZATION',
    NOT_FOUND = 'NOT_FOUND',
    SERVER = 'SERVER',
    CLIENT = 'CLIENT',
    UNKNOWN = 'UNKNOWN',
}

/**
 * User-friendly error messages for different error types
 */
export const ERROR_MESSAGES = {
    [ErrorType.NETWORK]: 'Network connection error. Please check your internet connection and try again.',
    [ErrorType.VALIDATION]: 'Please check your input and try again.',
    [ErrorType.AUTHENTICATION]: 'Authentication required. Please log in and try again.',
    [ErrorType.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
    [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
    [ErrorType.SERVER]: 'Server error. Please try again later.',
    [ErrorType.CLIENT]: 'There was a problem with your request. Please try again.',
    [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.',
} as const;

/**
 * Specific error messages for common API errors
 */
export const SPECIFIC_ERROR_MESSAGES = {
    'MISSING_REQUIRED_FIELDS': 'Please fill in all required fields.',
    'INVALID_FILE_TYPE': 'Please upload a valid image file (JPEG, PNG, or WebP).',
    'FILE_TOO_LARGE': 'The uploaded file is too large. Please choose a smaller file.',
    'SERVICE_UNAVAILABLE': 'The AI service is currently unavailable. Please try again later.',
    'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again.',
    'REQUEST_TIMEOUT': 'The request took too long. Please try again.',
    'GENERATION_FAILED': 'Failed to generate the virtual try-on image. Please try again.',
    'RECOMMENDATION_ERROR': 'Failed to generate recommendations. Please try again.',
    'CORS_ERROR': 'Cross-origin request blocked. Please contact support.',
} as const;

/**
 * Determines the error type based on status code and error code
 */
export function getErrorType(error: ApiError): ErrorType {
    const { statusCode, code } = error;

    // Network errors
    if (statusCode === 0 || code === 'NETWORK_ERROR') {
        return ErrorType.NETWORK;
    }

    // Client errors (4xx)
    if (statusCode >= 400 && statusCode < 500) {
        switch (statusCode) {
            case 400:
                return ErrorType.VALIDATION;
            case 401:
                return ErrorType.AUTHENTICATION;
            case 403:
                return ErrorType.AUTHORIZATION;
            case 404:
                return ErrorType.NOT_FOUND;
            default:
                return ErrorType.CLIENT;
        }
    }

    // Server errors (5xx)
    if (statusCode >= 500) {
        return ErrorType.SERVER;
    }

    return ErrorType.UNKNOWN;
}

/**
 * Gets a user-friendly error message for display
 */
export function getUserFriendlyMessage(error: ApiError): string {
    // Check for specific error codes first
    if (error.code && error.code in SPECIFIC_ERROR_MESSAGES) {
        return SPECIFIC_ERROR_MESSAGES[error.code as keyof typeof SPECIFIC_ERROR_MESSAGES];
    }

    // Fall back to error type message
    const errorType = getErrorType(error);
    return ERROR_MESSAGES[errorType];
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: ApiError): boolean {
    const { statusCode, code } = error;

    // Network errors are retryable
    if (statusCode === 0 || code === 'NETWORK_ERROR') {
        return true;
    }

    // Specific retryable status codes
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(statusCode);
}

/**
 * Gets retry delay based on error type and attempt number
 */
export function getRetryDelay(error: ApiError, attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    // Exponential backoff with jitter
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.1 * exponentialDelay;

    // Rate limit errors should wait longer
    if (error.statusCode === 429) {
        return Math.min(exponentialDelay * 2 + jitter, maxDelay);
    }

    return exponentialDelay + jitter;
}

/**
 * Error context for tracking and debugging
 */
export interface ErrorContext {
    component?: string;
    action?: string;
    userId?: string;
    sessionId?: string;
    timestamp: string;
    userAgent: string;
    url: string;
    additionalData?: Record<string, any>;
}

/**
 * Creates error context for reporting
 */
export function createErrorContext(
    component?: string,
    action?: string,
    additionalData?: Record<string, any>
): ErrorContext {
    return {
        component,
        action,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        additionalData,
    };
}

/**
 * Reports error to tracking service (placeholder for actual implementation)
 */
export function reportError(
    error: Error | ApiError,
    context: ErrorContext
): void {
    // In development, log to console
    if (import.meta.env.MODE === 'development') {
        console.group('🔥 Error Report');
        console.error('Error:', error);
        console.error('Context:', context);
        console.groupEnd();
    }

    // TODO: Implement actual error reporting service
    // Examples:
    // - Sentry: Sentry.captureException(error, { contexts: { custom: context } });
    // - LogRocket: LogRocket.captureException(error);
    // - Custom API: errorReportingAPI.report(error, context);
}

/**
 * Handles errors with automatic retry logic
 */
export class ErrorHandler {
    private maxRetries: number;


    constructor(maxRetries = 3) {
        this.maxRetries = maxRetries;
    }

    /**
     * Executes a function with automatic retry on retryable errors
     */
    async withRetry<T>(
        fn: () => Promise<T>,
        context: ErrorContext,
        onRetry?: (error: ApiError, attempt: number) => void
    ): Promise<T> {
        let lastError: ApiError;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error instanceof ApiError
                    ? error
                    : new ApiError(
                        error instanceof Error ? error.message : 'Unknown error',
                        0,
                        'UNKNOWN_ERROR'
                    );

                // Don't retry if it's not a retryable error
                if (!isRetryableError(lastError)) {
                    break;
                }

                // Don't retry on the last attempt
                if (attempt === this.maxRetries) {
                    break;
                }

                // Call retry callback if provided
                if (onRetry) {
                    onRetry(lastError, attempt + 1);
                }

                // Wait before retrying
                const delay = getRetryDelay(lastError, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // Report the final error
        reportError(lastError!, context);
        throw lastError!;
    }
}

/**
 * Default error handler instance
 */
export const defaultErrorHandler = new ErrorHandler();

/**
 * Utility function to handle API errors in components
 */
export function handleApiError(
    error: unknown,
    context: ErrorContext,
    onError?: (message: string, error: ApiError) => void
): void {
    const apiError = error instanceof ApiError
        ? error
        : new ApiError(
            error instanceof Error ? error.message : 'Unknown error',
            0,
            'UNKNOWN_ERROR'
        );

    const userMessage = getUserFriendlyMessage(apiError);

    // Report error
    reportError(apiError, context);

    // Call error callback if provided
    if (onError) {
        onError(userMessage, apiError);
    }
}