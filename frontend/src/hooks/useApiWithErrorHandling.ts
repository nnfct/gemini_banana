import { useState, useCallback, useRef, useEffect } from 'react';
import { ApiError } from '../services';
import {
    createErrorContext,
    getUserFriendlyMessage,
    isRetryableError,
    defaultErrorHandler
} from '../utils/errorHandling';
import { useToast } from '../components/ui/Toast';

// Enhanced API state interface
interface ApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    success: boolean;
    retryCount: number;
}

// Enhanced API hook options
interface UseApiWithErrorHandlingOptions {
    immediate?: boolean;
    resetOnCall?: boolean;
    showErrorToast?: boolean;
    showSuccessToast?: boolean;
    successMessage?: string;
    component?: string;
    action?: string;
    maxRetries?: number;
    onSuccess?: (data: any) => void;
    onError?: (error: ApiError) => void;
    onRetry?: (error: ApiError, attempt: number) => void;
}

// Enhanced API hook return type
interface UseApiWithErrorHandlingReturn<T, P extends any[]> extends ApiState<T> {
    execute: (...params: P) => Promise<T>;
    retry: () => Promise<T | undefined>;
    reset: () => void;
    cancel: () => void;
}

/**
 * Enhanced API hook with comprehensive error handling, retry logic, and toast notifications
 */
export function useApiWithErrorHandling<T, P extends any[]>(
    apiFunction: (...params: P) => Promise<T>,
    options: UseApiWithErrorHandlingOptions = {}
): UseApiWithErrorHandlingReturn<T, P> {
    const {
        immediate = false,
        resetOnCall = true,
        showErrorToast = true,
        showSuccessToast = false,
        successMessage,
        component,
        action,
        maxRetries = 3,
        onSuccess,
        onError,
        onRetry
    } = options;

    const { addToast } = useToast();

    const [state, setState] = useState<ApiState<T>>({
        data: null,
        loading: false,
        error: null,
        success: false,
        retryCount: 0,
    });

    const cancelRef = useRef<boolean>(false);
    const mountedRef = useRef<boolean>(true);
    const lastParamsRef = useRef<P | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            cancelRef.current = true;
        };
    }, []);

    const executeWithErrorHandling = useCallback(async (...params: P): Promise<T> => {
        if (resetOnCall) {
            setState(prev => ({
                ...prev,
                loading: true,
                error: null,
                success: false,
                retryCount: 0,
            }));
        } else {
            setState(prev => ({
                ...prev,
                loading: true,
                error: null,
            }));
        }

        cancelRef.current = false;
        lastParamsRef.current = params;

        const context = createErrorContext(component, action, {
            params: params.length > 0 ? 'provided' : 'none'
        });

        try {
            const result = await defaultErrorHandler.withRetry(
                () => apiFunction(...params),
                context,
                (error, attempt) => {
                    if (!cancelRef.current && mountedRef.current) {
                        setState(prev => ({
                            ...prev,
                            retryCount: attempt,
                        }));

                        if (onRetry) {
                            onRetry(error, attempt);
                        }

                        // Show retry toast for user feedback
                        if (showErrorToast && attempt <= maxRetries) {
                            addToast({
                                type: 'warning',
                                title: 'Retrying...',
                                message: `Attempt ${attempt} of ${maxRetries}`,
                                duration: 2000,
                            });
                        }
                    }
                }
            );

            if (!cancelRef.current && mountedRef.current) {
                setState({
                    data: result,
                    loading: false,
                    error: null,
                    success: true,
                    retryCount: 0,
                });

                if (onSuccess) {
                    onSuccess(result);
                }

                if (showSuccessToast) {
                    addToast({
                        type: 'success',
                        title: successMessage || 'Success',
                        duration: 3000,
                    });
                }
            }

            return result;
        } catch (error) {
            if (!cancelRef.current && mountedRef.current) {
                const apiError = error instanceof ApiError ? error : new ApiError(
                    error instanceof Error ? error.message : 'Unknown error',
                    0,
                    'UNKNOWN_ERROR'
                );

                const userMessage = getUserFriendlyMessage(apiError);

                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: userMessage,
                    success: false,
                }));

                if (onError) {
                    onError(apiError);
                }

                if (showErrorToast) {
                    const canRetry = isRetryableError(apiError);
                    addToast({
                        type: 'error',
                        title: 'Error',
                        message: userMessage,
                        action: canRetry ? {
                            label: 'Retry',
                            onClick: () => retry(),
                        } : undefined,
                    });
                }
            }

            throw error;
        }
    }, [
        apiFunction,
        resetOnCall,
        component,
        action,
        maxRetries,
        onSuccess,
        onError,
        onRetry,
        showErrorToast,
        showSuccessToast,
        successMessage,
        addToast
    ]);

    const retry = useCallback(async (): Promise<T | undefined> => {
        if (lastParamsRef.current) {
            try {
                return await executeWithErrorHandling(...lastParamsRef.current);
            } catch (error) {
                // Error is already handled in executeWithErrorHandling
                return undefined;
            }
        }
        return undefined;
    }, [executeWithErrorHandling]);

    const reset = useCallback(() => {
        setState({
            data: null,
            loading: false,
            error: null,
            success: false,
            retryCount: 0,
        });
        lastParamsRef.current = null;
    }, []);

    const cancel = useCallback(() => {
        cancelRef.current = true;
        setState(prev => ({
            ...prev,
            loading: false,
        }));
    }, []);

    // Execute immediately if requested
    useEffect(() => {
        if (immediate) {
            executeWithErrorHandling();
        }
    }, [immediate]); // Only depend on immediate to avoid infinite loops

    return {
        ...state,
        execute: executeWithErrorHandling,
        retry,
        reset,
        cancel,
    };
}

/**
 * Hook for handling form submissions with error handling
 */
export function useFormSubmission<T, P extends any[]>(
    submitFunction: (...params: P) => Promise<T>,
    options: UseApiWithErrorHandlingOptions = {}
) {
    return useApiWithErrorHandling(submitFunction, {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Form submitted successfully',
        ...options,
    });
}

/**
 * Hook for handling file uploads with error handling
 */
export function useFileUpload<T, P extends any[]>(
    uploadFunction: (...params: P) => Promise<T>,
    options: UseApiWithErrorHandlingOptions = {}
) {
    return useApiWithErrorHandling(uploadFunction, {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'File uploaded successfully',
        maxRetries: 1, // File uploads typically shouldn't be retried automatically
        ...options,
    });
}

export default useApiWithErrorHandling;