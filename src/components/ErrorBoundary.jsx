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
        // if (process.env.NODE_ENV === 'production') {
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
                <div className="halftone grain min-h-screen flex items-center justify-center bg-black px-4 font-body text-white">
                    <div className="max-w-2xl w-full">
                        <div className="bg-black border-2 border-pink p-8">
                            {/* Icon — sticker-style pink square */}
                            <div className="w-12 h-12 bg-pink flex items-center justify-center mb-6">
                                <svg
                                    className="w-6 h-6 text-black"
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
                            <h1 className="font-display text-[48px] sm:text-[64px] leading-[0.88] tracking-[0.005em] text-white mb-4 uppercase">
                                Something<br/>broke<span className="text-pink">.</span>
                            </h1>

                            {/* Description */}
                            <p className="text-white/70 mb-6 text-[13px] font-body leading-[1.55]">
                                We hit an unexpected error. It&apos;s been logged and we&apos;ll look into it.
                                Try reloading the page or returning home.
                            </p>

                            {/* Error details (dev mode only) */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <div className="mb-6 p-4 bg-black border-2 border-pink">
                                    <h3 className="text-[10px] font-body text-pink mb-2 uppercase tracking-[0.28em]">
                                        <span className="text-pink">●</span>&nbsp;&nbsp;Error Details (Dev Mode)
                                    </h3>
                                    <pre className="text-[11px] text-white/70 overflow-x-auto whitespace-pre-wrap break-words font-body">
                                        {this.state.error.toString()}
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={this.handleReset}
                                    className="tape press px-7 py-4 font-display text-[18px] uppercase tracking-[0.02em] text-black"
                                >
                                    Try Again ▸
                                </button>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="press px-7 py-4 bg-black text-white border-2 hairline-white hover:border-pink hover:text-pink font-display text-[14px] uppercase tracking-[0.22em] transition-colors"
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
