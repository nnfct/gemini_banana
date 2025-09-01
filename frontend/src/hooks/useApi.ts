import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '../services';

// Generic API state interface
interface ApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    success: boolean;
}

// API hook options
interface UseApiOptions {
    immediate?: boolean; // Execute immediately on mount
    resetOnCall?: boolean; // Reset state before each call
    onSuccess?: (data: any) => void;
    onError?: (error: ApiError) => void;
}

// API hook return type
interface UseApiReturn<T, P extends any[]> extends ApiState<T> {
    execute: (...params: P) => Promise<T>;
    reset: () => void;
    cancel: () => void;
}

/**
 * Generic hook for API calls with loading, error, and success state management
 * @param apiFunction - The API function to call
 * @param options - Configuration options
 * @returns API state and control functions
 */
export function useApi<T, P extends any[]>(
    apiFunction: (...params: P) => Promise<T>,
    options: UseApiOptions = {}
): UseApiReturn<T, P> {
    const {
        immediate = false,
        resetOnCall = true,
        onSuccess,
        onError
    } = options;

    const [state, setState] = useState<ApiState<T>>({
        data: null,
        loading: false,
        error: null,
        success: false,
    });

    const cancelRef = useRef<boolean>(false);
    const mountedRef = useRef<boolean>(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            cancelRef.current = true;
        };
    }, []);

    const execute = useCallback(async (...params: P): Promise<T> => {
        if (resetOnCall) {
            setState(prev => ({
                ...prev,
                loading: true,
                error: null,
                success: false,
            }));
        } else {
            setState(prev => ({
                ...prev,
                loading: true,
                error: null,
            }));
        }

        cancelRef.current = false;

        try {
            const result = await apiFunction(...params);

            if (!cancelRef.current && mountedRef.current) {
                setState({
                    data: result,
                    loading: false,
                    error: null,
                    success: true,
                });

                if (onSuccess) {
                    onSuccess(result);
                }
            }

            return result;
        } catch (error) {
            if (!cancelRef.current && mountedRef.current) {
                const errorMessage = error instanceof ApiError
                    ? error.message
                    : 'An unexpected error occurred';

                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: errorMessage,
                    success: false,
                }));

                if (onError && error instanceof ApiError) {
                    onError(error);
                }
            }

            throw error;
        }
    }, [apiFunction, resetOnCall, onSuccess, onError]);

    const reset = useCallback(() => {
        setState({
            data: null,
            loading: false,
            error: null,
            success: false,
        });
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
            execute();
        }
    }, [immediate]); // Only depend on immediate, not execute to avoid infinite loops

    return {
        ...state,
        execute,
        reset,
        cancel,
    };
}

/**
 * Hook for managing multiple API calls with combined loading state
 * @param apiCalls - Object with named API functions
 * @returns Combined state and individual execute functions
 */
export function useMultipleApi<T extends Record<string, (...args: any[]) => Promise<any>>>(
    apiCalls: T
): {
    loading: boolean;
    errors: Record<keyof T, string | null>;
    success: Record<keyof T, boolean>;
    execute: {
        [K in keyof T]: T[K] extends (...args: infer P) => Promise<infer R>
        ? (...params: P) => Promise<R>
        : never;
    };
    reset: () => void;
} {
    const [states, setStates] = useState<Record<keyof T, ApiState<any>>>(() => {
        const initialStates = {} as Record<keyof T, ApiState<any>>;
        Object.keys(apiCalls).forEach(key => {
            initialStates[key as keyof T] = {
                data: null,
                loading: false,
                error: null,
                success: false,
            };
        });
        return initialStates;
    });

    const execute = {} as {
        [K in keyof T]: T[K] extends (...args: infer P) => Promise<infer R>
        ? (...params: P) => Promise<R>
        : never;
    };

    Object.keys(apiCalls).forEach(key => {
        const apiKey = key as keyof T;
        execute[apiKey] = (async (...params: any[]) => {
            setStates(prev => ({
                ...prev,
                [apiKey]: {
                    ...prev[apiKey],
                    loading: true,
                    error: null,
                },
            }));

            try {
                const result = await apiCalls[apiKey](...params);
                setStates(prev => ({
                    ...prev,
                    [apiKey]: {
                        data: result,
                        loading: false,
                        error: null,
                        success: true,
                    },
                }));
                return result;
            } catch (error) {
                const errorMessage = error instanceof ApiError
                    ? error.message
                    : 'An unexpected error occurred';

                setStates(prev => ({
                    ...prev,
                    [apiKey]: {
                        ...prev[apiKey],
                        loading: false,
                        error: errorMessage,
                        success: false,
                    },
                }));
                throw error;
            }
        }) as any;
    });

    const reset = useCallback(() => {
        const resetStates = {} as Record<keyof T, ApiState<any>>;
        Object.keys(apiCalls).forEach(key => {
            resetStates[key as keyof T] = {
                data: null,
                loading: false,
                error: null,
                success: false,
            };
        });
        setStates(resetStates);
    }, [apiCalls]);

    const loading = Object.values(states).some(state => state.loading);
    const errors = {} as Record<keyof T, string | null>;
    const success = {} as Record<keyof T, boolean>;

    Object.keys(states).forEach(key => {
        const apiKey = key as keyof T;
        errors[apiKey] = states[apiKey].error;
        success[apiKey] = states[apiKey].success;
    });

    return {
        loading,
        errors,
        success,
        execute,
        reset,
    };
}