// Tests for ErrorBoundary component
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div>No error</div>;
};

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error;
beforeEach(() => {
    console.error = vi.fn();
});

afterEach(() => {
    console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('renders error UI when child component throws', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });

    it('renders custom fallback UI', () => {
        const CustomFallback = ({ error }: { error: Error }) => (
            <div>Custom error: {error.message}</div>
        );

        render(
            <ErrorBoundary fallback={CustomFallback}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
        const onError = vi.fn();

        render(
            <ErrorBoundary onError={onError}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(onError).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({
                componentStack: expect.any(String)
            })
        );
    });

    it('can reset error state', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Error should be displayed
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

        // Reset by changing children
        rerender(
            <ErrorBoundary>
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('shows retry button when onRetry is provided', () => {
        const onRetry = vi.fn();

        render(
            <ErrorBoundary onRetry={onRetry}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        const retryButton = screen.getByRole('button', { name: /try again/i });
        expect(retryButton).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
        const onRetry = vi.fn();
        const { user } = render(
            <ErrorBoundary onRetry={onRetry}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        const retryButton = screen.getByRole('button', { name: /try again/i });
        await user.click(retryButton);

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('handles errors in different lifecycle methods', () => {
        // Test error in componentDidMount
        const ComponentWithMountError = () => {
            React.useEffect(() => {
                throw new Error('Mount error');
            }, []);
            return <div>Component</div>;
        };

        render(
            <ErrorBoundary>
                <ComponentWithMountError />
            </ErrorBoundary>
        );

        // Should still render the component since useEffect errors aren't caught by error boundaries
        expect(screen.getByText('Component')).toBeInTheDocument();
    });

    it('logs error details in development mode', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(console.error).toHaveBeenCalled();

        process.env.NODE_ENV = originalEnv;
    });

    it('handles multiple errors gracefully', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

        // Trigger another error
        rerender(
            <ErrorBoundary>
                <ThrowError shouldThrow={false} />
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
});