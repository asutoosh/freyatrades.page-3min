/**
 * Client Error Boundary Wrapper
 * 
 * Wraps the application with error boundary on client side
 * Server-side errors are handled by Next.js error boundaries
 */

'use client'

import { ErrorBoundary } from './ErrorBoundary'
import { ReactNode } from 'react'

export function ClientErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}
