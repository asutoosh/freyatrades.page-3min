/**
 * Error Boundary Component
 * 
 * Catches React rendering errors and provides a fallback UI
 * Prevents the entire app from crashing due to a single component error
 */

'use client'

import { Component, ReactNode } from 'react'

interface ReactErrorInfo {
  componentStack: string
  errorBoundary?: string
  errorBoundaryStack?: string
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ReactErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ReactErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo)
    }
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      // Default fallback UI
      return (
        <div className="min-h-screen bg-[#050608] flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10">
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
            </div>
            
            {/* Error Message */}
            <h1 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-400 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            
            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
                <p className="text-xs font-mono text-red-400 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
