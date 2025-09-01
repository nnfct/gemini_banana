
import Button from './Button';

interface FallbackUIProps {
    title?: string;
    message?: string;
    showRetry?: boolean;
    showReload?: boolean;
    onRetry?: () => void;
    onReload?: () => void;
    icon?: 'error' | 'warning' | 'offline' | 'maintenance';
}

/**
 * Fallback UI component for error states, offline mode, maintenance, etc.
 */
export function FallbackUI({
    title = 'Something went wrong',
    message = 'We\'re sorry, but something unexpected happened. Please try again.',
    showRetry = true,
    showReload = true,
    onRetry,
    onReload = () => window.location.reload(),
    icon = 'error'
}: FallbackUIProps) {
    const getIcon = () => {
        const iconClass = "mx-auto h-12 w-12 text-gray-400";

        switch (icon) {
            case 'error':
                return (
                    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                );
            case 'offline':
                return (
                    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z"
                        />
                    </svg>
                );
            case 'maintenance':
                return (
                    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-4">
                    {getIcon()}
                </div>

                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {title}
                </h3>

                <p className="text-sm text-gray-500 mb-6">
                    {message}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {showRetry && onRetry && (
                        <Button
                            onClick={onRetry}
                            variant="primary"
                            className="flex-1 sm:flex-none"
                        >
                            Try Again
                        </Button>
                    )}
                    {showReload && (
                        <Button
                            onClick={onReload}
                            variant="secondary"
                            className="flex-1 sm:flex-none"
                        >
                            Reload Page
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Specific fallback components for common scenarios
 */
export const NetworkErrorFallback = (props: Partial<FallbackUIProps>) => (
    <FallbackUI
        title="Connection Problem"
        message="Please check your internet connection and try again."
        icon="offline"
        {...props}
    />
);

export const ServerErrorFallback = (props: Partial<FallbackUIProps>) => (
    <FallbackUI
        title="Server Error"
        message="Our servers are experiencing issues. Please try again in a few moments."
        icon="error"
        {...props}
    />
);

export const MaintenanceFallback = (props: Partial<FallbackUIProps>) => (
    <FallbackUI
        title="Under Maintenance"
        message="We're currently performing maintenance. Please check back soon."
        icon="maintenance"
        showRetry={false}
        {...props}
    />
);

export default FallbackUI;