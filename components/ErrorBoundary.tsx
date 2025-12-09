'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { EXTERNAL_LINKS } from '@/lib/constants'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Could send to error reporting service here
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050608] px-4">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-md w-full">
            <div className="bg-gradient-to-b from-[#141418] to-[#0f0f12] rounded-2xl border border-white/10 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

              <div className="p-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800/50 flex items-center justify-center text-4xl">
                  ⚠️
                </div>

                <h2 className="text-xl font-bold text-center text-white mb-3">
                  Something Went Wrong
                </h2>

                <p className="text-zinc-400 text-center mb-8 leading-relaxed">
                  We encountered an unexpected error. Please try refreshing the page.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold hover:from-yellow-300 hover:to-yellow-400 transition-all"
                  >
                    🔄 Refresh Page
                  </button>

                  <a
                    href={EXTERNAL_LINKS.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#229ed9] text-white font-semibold hover:bg-[#1e8dc2] transition-colors"
                  >
                    Join 3-Day Trial on Telegram
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
