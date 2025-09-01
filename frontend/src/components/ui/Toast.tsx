import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Hook to access toast functionality
 */
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

/**
 * Toast Provider component
 */
interface ToastProviderProps {
    children: ReactNode;
    maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (toast: Omit<Toast, 'id'>): string => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = {
            ...toast,
            id,
            duration: toast.duration ?? (toast.type === 'error' ? 0 : 5000), // Error toasts don't auto-dismiss
        };

        setToasts(prev => {
            const updated = [newToast, ...prev];
            // Limit number of toasts
            return updated.slice(0, maxToasts);
        });

        // Auto-dismiss if duration is set
        if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, newToast.duration);
        }

        return id;
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const clearToasts = () => {
        setToasts([]);
    };

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

/**
 * Toast Container component that renders all toasts
 */
interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

/**
 * Individual Toast Item component
 */
interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleRemove = () => {
        setIsLeaving(true);
        setTimeout(() => onRemove(toast.id), 300); // Match animation duration
    };

    const getToastStyles = () => {
        const baseStyles = "relative p-4 rounded-lg shadow-lg border transition-all duration-300 transform";
        const visibilityStyles = isVisible && !isLeaving
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0";

        const typeStyles = {
            success: "bg-green-50 border-green-200 text-green-800",
            error: "bg-red-50 border-red-200 text-red-800",
            warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
            info: "bg-blue-50 border-blue-200 text-blue-800",
        };

        return `${baseStyles} ${visibilityStyles} ${typeStyles[toast.type]}`;
    };

    const getIcon = () => {
        const iconStyles = "h-5 w-5 flex-shrink-0";

        switch (toast.type) {
            case 'success':
                return (
                    <svg className={`${iconStyles} text-green-400`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className={`${iconStyles} text-red-400`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className={`${iconStyles} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className={`${iconStyles} text-blue-400`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    return (
        <div className={getToastStyles()}>
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium">
                        {toast.title}
                    </p>
                    {toast.message && (
                        <p className="mt-1 text-sm opacity-90">
                            {toast.message}
                        </p>
                    )}
                    {toast.action && (
                        <div className="mt-2">
                            <button
                                onClick={toast.action.onClick}
                                className="text-sm font-medium underline hover:no-underline focus:outline-none"
                            >
                                {toast.action.label}
                            </button>
                        </div>
                    )}
                </div>
                <div className="ml-4 flex-shrink-0">
                    <button
                        onClick={handleRemove}
                        className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
                    >
                        <span className="sr-only">Close</span>
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Utility functions for common toast types
 */
export const toast = {
    success: (title: string, message?: string, options?: Partial<Toast>) => ({
        type: 'success' as const,
        title,
        message,
        ...options,
    }),
    error: (title: string, message?: string, options?: Partial<Toast>) => ({
        type: 'error' as const,
        title,
        message,
        duration: 0, // Error toasts don't auto-dismiss by default
        ...options,
    }),
    warning: (title: string, message?: string, options?: Partial<Toast>) => ({
        type: 'warning' as const,
        title,
        message,
        ...options,
    }),
    info: (title: string, message?: string, options?: Partial<Toast>) => ({
        type: 'info' as const,
        title,
        message,
        ...options,
    }),
};

export default ToastProvider;