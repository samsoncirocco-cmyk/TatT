/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the component tree,
 * logs those errors, and displays a fallback UI.
 */

import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Error info:', errorInfo);

        this.setState({
            error,
            errorInfo
        });

        // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
        // if (import.meta.env.PROD) {
        //     Sentry.captureException(error, { contexts: { react: errorInfo } });
        // }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });

        // Optionally reload the page
        if (this.props.resetOnError) {
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleReset);
            }

            // Default fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-black px-4">
                    <div className="max-w-2xl w-full">
                        <div className="glass-panel rounded-3xl border border-white/10 p-8">
                            {/* Icon */}
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                                <svg
                                    className="w-8 h-8 text-red-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>

                            {/* Title */}
                            <h1 className="text-3xl font-display font-black text-white mb-3">
                                Something went wrong
                            </h1>

                            {/* Description */}
                            <p className="text-white/70 mb-6">
                                We encountered an unexpected error. This has been logged and we'll look into it.
                                You can try reloading the page or returning to the home page.
                            </p>

                            {/* Error details (dev mode only) */}
                            {import.meta.env.DEV && this.state.error && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                    <h3 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wider">
                                        Error Details (Dev Mode)
                                    </h3>
                                    <pre className="text-xs text-red-300 overflow-x-auto whitespace-pre-wrap break-words">
                                        {this.state.error.toString()}
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={this.handleReset}
                                    className="px-6 py-3 bg-ducks-yellow text-black font-black rounded-xl hover:bg-white transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    Return Home
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook-based error boundary wrapper
 * Use this for functional components that need error boundaries
 */
export function withErrorBoundary(Component, fallback, resetOnError = false) {
    return function WrappedComponent(props) {
        return (
            <ErrorBoundary fallback={fallback} resetOnError={resetOnError}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}

export default ErrorBoundary;
