'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

interface Signal {
  id: string
  type: 'signal' | 'update'
  script: string
  position?: 'BUY' | 'SELL'
  entryPrice?: string
  tp1?: string
  tp2?: string
  tp3?: string
  tp4?: string
  stopLoss?: string
  updateType?: 'tp' | 'sl'
  tpLevel?: number
  hitPrice?: string
  signalDirection?: 'Long' | 'Short'
  timestamp: string
  color: 'green' | 'red' | 'default'
}

interface ApiResponse {
  signals: Signal[]
  count: number
  totalCount: number
  hasMore: boolean
  skip: number
  limit: number
  error?: string
  status?: {
    databaseConnected: boolean
    hasSignals: boolean
  }
}

// Format timestamp for chat display
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  
  const time = date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
  
  if (isToday) {
    return `Today ${time}`
  }
  
  if (isYesterday) {
    return `Yesterday ${time}`
  }
  
  // For older dates, show month and day
  const monthDay = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
  return `${monthDay}, ${time}`
}

export default function MoneyGlitch() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbConnected, setDbConnected] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const lastSignalIdRef = useRef<string | null>(null)

  // Fetch signals with pagination
  const fetchSignals = useCallback(async (skip: number = 0, append: boolean = false) => {
    try {
      const res = await fetch(`/api/signals?limit=100&skip=${skip}`)
      const data: ApiResponse = await res.json()
      
      if (data.error) {
        setError(data.error)
        if (!append) setSignals([])
      } else {
        setError(null)
        
        if (append && data.signals.length > 0) {
          // Prepend older signals (they go at the top)
          setSignals(prev => [...data.signals.reverse(), ...prev])
        } else if (!append) {
          // Initial load - reverse so oldest is first, newest at bottom
          setSignals(data.signals.reverse())
          lastSignalIdRef.current = data.signals[0]?.id || null
        }
        
        setHasMore(data.hasMore)
        setTotalCount(data.totalCount)
      }
      
      if (data.status) {
        setDbConnected(data.status.databaseConnected)
      }
    } catch (err) {
      console.error('Failed to fetch signals:', err)
      if (!append) {
        setError('Failed to connect to signals API')
        setSignals([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Load more older messages when scrolling up
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    const currentLength = signals.length
    
    // Save scroll position
    const container = scrollContainerRef.current
    const prevScrollHeight = container?.scrollHeight || 0
    
    await fetchSignals(currentLength, true)
    
    // Restore scroll position after loading
    if (container) {
      const newScrollHeight = container.scrollHeight
      container.scrollTop = newScrollHeight - prevScrollHeight
    }
  }, [loadingMore, hasMore, signals.length, fetchSignals])

  // Check for new signals (polling)
  const checkForNewSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/signals?limit=10&skip=0')
      const data: ApiResponse = await res.json()
      
      if (data.signals && data.signals.length > 0) {
        const newestSignal = data.signals[0]
        
        // If we have a new signal that wasn't there before
        if (lastSignalIdRef.current && newestSignal.id !== lastSignalIdRef.current) {
          // Find new signals
          const existingIds = new Set(signals.map(s => s.id))
          const newSignals = data.signals
            .filter(s => !existingIds.has(s.id))
            .reverse() // Oldest first
          
          if (newSignals.length > 0) {
            setSignals(prev => [...prev, ...newSignals])
            lastSignalIdRef.current = newestSignal.id
            
            // Auto-scroll to bottom if user was at bottom
            if (isAtBottomRef.current && scrollContainerRef.current) {
              setTimeout(() => {
                scrollContainerRef.current?.scrollTo({
                  top: scrollContainerRef.current.scrollHeight,
                  behavior: 'smooth'
                })
              }, 100)
            }
          }
        }
        
        setTotalCount(data.totalCount)
      }
    } catch (err) {
      console.error('Failed to check for new signals:', err)
    }
  }, [signals])

  // Initial load
  useEffect(() => {
    fetchSignals(0, false)
  }, [fetchSignals])

  // Auto-scroll to bottom after initial load
  useEffect(() => {
    if (!loading && signals.length > 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [loading, signals.length === 0])

  // Poll for new signals every 15 seconds
  useEffect(() => {
    if (loading) return
    
    const interval = setInterval(checkForNewSignals, 15000)
    return () => clearInterval(interval)
  }, [loading, checkForNewSignals])

  // Handle scroll events - throttled for performance
  const scrollThrottleRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleScroll = useCallback(() => {
    // Throttle scroll events
    if (scrollThrottleRef.current) return
    
    scrollThrottleRef.current = setTimeout(() => {
      scrollThrottleRef.current = null
      
      const container = scrollContainerRef.current
      if (!container) return
      
      // Check if at bottom (within 50px)
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50
      isAtBottomRef.current = isAtBottom
      
      // Load more when near top (within 100px)
      if (container.scrollTop < 100 && hasMore && !loadingMore) {
        loadMore()
      }
    }, 100) // Throttle to max 10 events/second
  }, [hasMore, loadingMore, loadMore])

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 space-y-4 p-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="message-card animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800" />
                <div className="h-4 w-24 bg-zinc-800 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-zinc-800 rounded" />
                <div className="h-4 w-48 bg-zinc-800 rounded" />
                <div className="h-4 w-40 bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-0">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold text-red-400 mb-2">Connection Error</h3>
          <p className="text-zinc-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true)
              fetchSignals(0, false)
            }}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // No database connected state
  if (!dbConnected) {
    return (
      <div className="flex items-center justify-center h-full min-h-0">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 mb-4">
            <span className="text-3xl">🔌</span>
          </div>
          <h3 className="text-xl font-semibold text-yellow-400 mb-2">Database Not Connected</h3>
          <p className="text-zinc-400 mb-2">The signals database is not configured.</p>
          <p className="text-zinc-500 text-sm">Signals will appear once the database connection is established.</p>
        </div>
      </div>
    )
  }

  // No signals state
  if (signals.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Live indicator */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 m-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
          </span>
          <span className="text-yellow-400 text-sm font-medium">Waiting for Signals</span>
          <span className="text-zinc-500 text-xs ml-auto">Auto-refreshes</span>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 mb-4">
              <span className="text-3xl">📡</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Signals Yet</h3>
            <p className="text-zinc-400 mb-2">Premium signals will appear here in real-time.</p>
            <p className="text-zinc-500 text-sm">The bot is connected and monitoring for new signals.</p>
          </div>
        </div>
      </div>
    )
  }

  // Has signals - render chat view
  return (
    <div className="flex flex-col h-full min-h-0 relative">
      {/* Scrollable chat container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pb-4 scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Loading more indicator at top */}
        {loadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"
              />
              <span className="text-zinc-400 text-sm">Loading older signals...</span>
            </div>
          </div>
        )}

        {/* Load more button at top */}
        {hasMore && !loadingMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={loadMore}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              ↑ Load older messages ({totalCount - signals.length} more)
            </button>
          </div>
        )}

        {/* Signals list - oldest first, newest at bottom */}
        <div className="space-y-4">
          {signals.map((signal, index) => (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.5) }}
              className={`message-card ${
                signal.color === 'green' 
                  ? 'border-l-4 border-l-green-500 bg-green-500/5' 
                  : signal.color === 'red' 
                    ? 'border-l-4 border-l-red-500 bg-red-500/5'
                    : 'hover:border-yellow-500/20'
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/sorcerer.png" 
                  alt="sorcerer" 
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">sorcerer</span>
                  <span className="admin-badge">admin</span>
                  <span className="text-xs text-zinc-500">
                    {formatTimestamp(signal.timestamp)}
                  </span>
                </div>
              </div>

              {/* Content based on type */}
              {signal.type === 'signal' ? (
                // New Signal Card
                <div className="space-y-1.5 font-mono text-sm">
                  <p className="text-zinc-300">
                    script         : <span className="text-white font-semibold">{signal.script}</span>
                  </p>
                  <p className="text-zinc-300">
                    Position       : 
                    <span className={`ml-1 font-bold ${signal.position === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                      {signal.position} {signal.position === 'BUY' ? '⬆️' : '⬇️'}
                    </span>
                  </p>
                  <p className="text-zinc-300">
                    Enter Price    : <span className="text-white">{signal.entryPrice}</span>
                  </p>
                  
                  <div className="pt-2 space-y-1">
                    <p className="text-green-400">
                      Take Profit 1  : <span className="text-green-300">{signal.tp1}</span>
                    </p>
                    <p className="text-green-400">
                      Take Profit 2  : <span className="text-green-300">{signal.tp2}</span>
                    </p>
                    <p className="text-green-400">
                      Take Profit 3  : <span className="text-green-300">{signal.tp3}</span>
                    </p>
                    <p className="text-green-400">
                      Take Profit 4  : <span className="text-green-300">{signal.tp4}</span>
                    </p>
                  </div>
                  
                  <p className="text-red-400 pt-2">
                    Stoploss       : <span className="text-red-300">{signal.stopLoss}</span>
                  </p>

                  {/* Signal badge */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Premium Signal</span>
                    <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 text-xs font-medium">
                      💎 Active
                    </span>
                  </div>
                </div>
              ) : (
                // Update Card (TP or SL)
                <div className="space-y-2">
                  <p className="text-zinc-400 text-sm">Position Status</p>
                  
                  {signal.updateType === 'tp' ? (
                    // Take Profit Update - GREEN
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-green-400 font-semibold">
                        ✅ Take Profit {signal.tpLevel} From {signal.signalDirection} Signal
                      </p>
                      <p className="text-green-300 text-sm mt-1">
                        at Price: <span className="font-mono font-bold">{signal.hitPrice}</span> in <span className="font-bold">{signal.script}</span>
                      </p>
                    </div>
                  ) : (
                    // Stop Loss Hit - RED
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-red-400 font-semibold">
                        ❌ Hit SL From {signal.signalDirection} Signal
                      </p>
                      <p className="text-red-300 text-sm mt-1">
                        Price: <span className="font-mono font-bold">{signal.hitPrice}</span> in <span className="font-bold">{signal.script}</span>
                      </p>
                    </div>
                  )}

                  {/* Update badge */}
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Position Update</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      signal.updateType === 'tp' 
                        ? 'bg-green-500/10 text-green-400' 
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {signal.updateType === 'tp' ? '🎯 Profit' : '🛑 Stopped'}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Fixed live indicator at bottom */}
      <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-[#050608] via-[#050608] to-transparent pt-4 pb-2 px-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 backdrop-blur-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-green-400 text-sm font-medium">Live Signals Feed</span>
          <span className="text-zinc-500 text-xs ml-auto">{signals.length} of {totalCount} signals</span>
        </div>
      </div>
    </div>
  )
}
