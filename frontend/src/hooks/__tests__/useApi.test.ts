// Tests for useApi hook
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApi } from '../useApi';
import { mockApiResponse, mockApiError } from '../../test/mocks';

describe('useApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useApi());

        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('should handle successful API call', async () => {
        const mockApiCall = vi.fn().mockResolvedValue({ success: true });
        const { result } = renderHook(() => useApi());

        await act(async () => {
            await result.current.execute(mockApiCall);
        });

        expect(result.current.data).toEqual({ success: true });
        expect(result.current.error).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    it('should handle API call with parameters', async () => {
        const mockApiCall = vi.fn().mockResolvedValue({ result: 'test' });
        const { result } = renderHook(() => useApi());

        await act(async () => {
            await result.current.execute(mockApiCall, 'param1', 'param2');
        });

        expect(mockApiCall).toHaveBeenCalledWith('param1', 'param2');
        expect(result.current.data).toEqual({ result: 'test' });
    });

    it('should handle API call errors', async () => {
        const error = new Error('API Error');
        const mockApiCall = vi.fn().mockRejectedValue(error);
        const { result } = renderHook(() => useApi());

        await act(async () => {
            await result.current.execute(mockApiCall);
        });

        expect(result.current.data).toBeNull();
        expect(result.current.error).toBe(error);
        expect(result.current.loading).toBe(false);
    });

    it('should set loading state during API call', async () => {
        let resolvePromise: (value: any) => void;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        const mockApiCall = vi.fn().mockReturnValue(promise);

        const { result } = renderHook(() => useApi());

        act(() => {
            result.current.execute(mockApiCall);
        });

        expect(result.current.loading).toBe(true);
        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeNull();

        await act(async () => {
            resolvePromise({ success: true });
            await promise;
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.data).toEqual({ success: true });
    });

    it('should reset state', () => {
        const { result } = renderHook(() => useApi());

        // Set some state
        act(() => {
            result.current.setData({ test: true });
            result.current.setError(new Error('Test error'));
        });

        expect(result.current.data).toEqual({ test: true });
        expect(result.current.error).toBeInstanceOf(Error);

        // Reset
        act(() => {
            result.current.reset();
        });

        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('should handle concurrent API calls', async () => {
        const mockApiCall1 = vi.fn().mockResolvedValue({ id: 1 });
        const mockApiCall2 = vi.fn().mockResolvedValue({ id: 2 });
        const { result } = renderHook(() => useApi());

        // Start first call
        const promise1 = act(async () => {
            await result.current.execute(mockApiCall1);
        });

        // Start second call before first completes
        const promise2 = act(async () => {
            await result.current.execute(mockApiCall2);
        });

        await Promise.all([promise1, promise2]);

        // Should have the result of the last call
        expect(result.current.data).toEqual({ id: 2 });
    });

    it('should provide manual state setters', () => {
        const { result } = renderHook(() => useApi());

        act(() => {
            result.current.setData({ manual: true });
        });

        expect(result.current.data).toEqual({ manual: true });

        act(() => {
            result.current.setError(new Error('Manual error'));
        });

        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('Manual error');

        act(() => {
            result.current.setLoading(true);
        });

        expect(result.current.loading).toBe(true);
    });

    it('should handle API call that returns null/undefined', async () => {
        const mockApiCall = vi.fn().mockResolvedValue(null);
        const { result } = renderHook(() => useApi());

        await act(async () => {
            await result.current.execute(mockApiCall);
        });

        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('should handle synchronous API calls', async () => {
        const mockApiCall = vi.fn().mockReturnValue({ sync: true });
        const { result } = renderHook(() => useApi());

        await act(async () => {
            await result.current.execute(mockApiCall);
        });

        expect(result.current.data).toEqual({ sync: true });
        expect(result.current.error).toBeNull();
        expect(result.current.loading).toBe(false);
    });
});