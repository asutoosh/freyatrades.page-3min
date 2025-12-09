'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * BroadcastChannel-based multi-tab synchronization
 * Ensures timers stay in sync across all open tabs
 * 
 * Key behaviors:
 * - Leader election: First tab becomes leader, others follow
 * - Uses ABSOLUTE EXPIRY TIMESTAMP for sync (not relative time)
 * - All tabs run their own timer using the shared expiry timestamp
 * - Only leader saves progress to server
 */

interface TabSyncMessage {
  type: 'TIMER_UPDATE' | 'PREVIEW_ENDED' | 'LEADER_PING' | 'LEADER_CLAIM' | 'PROGRESS_SAVED' | 'REQUEST_TIME' | 'EXPIRY_SYNC'
  timeLeft?: number
  expiresAt?: number // Absolute timestamp when preview expires
  tabId?: string
  timestamp?: number
}

const CHANNEL_NAME = 'freya_preview_sync'
const LEADER_TIMEOUT_MS = 3000 // If no leader ping for 3s, claim leadership
const BROADCAST_INTERVAL_MS = 2000 // Sync timer every 2 seconds

export function useTabSync(options: {
  timeLeft: number
  setTimeLeft: (time: number) => void
  previewExpiresAt?: number | null // Absolute timestamp
  setPreviewExpiresAt?: (expiresAt: number) => void
  onPreviewEnded: () => void
  onBecameLeader?: () => void
  onLostLeadership?: () => void
}) {
  // Store options in refs to avoid dependency changes
  const optionsRef = useRef(options)
  optionsRef.current = options
  
  const channelRef = useRef<BroadcastChannel | null>(null)
  const tabIdRef = useRef<string>('')
  const isLeaderRef = useRef(false)
  const lastLeaderPingRef = useRef<number>(0)
  const [isLeader, setIsLeader] = useState(false)
  const initializedRef = useRef(false)
  
  // Generate tab ID once on mount
  useEffect(() => {
    tabIdRef.current = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])
  
  // Claim leadership function (stable - no deps)
  const claimLeadership = useCallback(() => {
    const timeSinceLastPing = Date.now() - lastLeaderPingRef.current
    
    if (timeSinceLastPing > LEADER_TIMEOUT_MS || lastLeaderPingRef.current === 0) {
      if (!isLeaderRef.current) {
        isLeaderRef.current = true
        setIsLeader(true)
        optionsRef.current.onBecameLeader?.()
        console.log('[TabSync] Claimed leadership')
        
        // Try to restore expiry from localStorage if we don't have it
        if (!optionsRef.current.previewExpiresAt) {
          try {
            const storedExpiresAt = localStorage.getItem('ft_preview_expires_at')
            if (storedExpiresAt) {
              const expiresAtMs = parseInt(storedExpiresAt, 10)
              if (!isNaN(expiresAtMs) && expiresAtMs > Date.now()) {
                console.log('[TabSync] New leader restored expiry from localStorage')
                optionsRef.current.setPreviewExpiresAt?.(expiresAtMs)
              }
            }
          } catch {}
        }
        
        // Announce leadership
        channelRef.current?.postMessage({
          type: 'LEADER_CLAIM',
          tabId: tabIdRef.current,
          timestamp: Date.now()
        } as TabSyncMessage)
      }
    }
  }, [])
  
  // Initialize BroadcastChannel ONCE
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializedRef.current) return
    initializedRef.current = true
    
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      // BroadcastChannel not supported - this tab becomes leader by default
      isLeaderRef.current = true
      setIsLeader(true)
      console.log('[TabSync] BroadcastChannel not supported - running as leader')
      return
    }
    
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME)
      channelRef.current = channel
      
      channel.onmessage = (event: MessageEvent<TabSyncMessage>) => {
        const msg = event.data
        
        switch (msg.type) {
          case 'TIMER_UPDATE':
            if (msg.timeLeft !== undefined && msg.tabId !== tabIdRef.current) {
              // Sync timer from leader - always accept leader's time
              optionsRef.current.setTimeLeft(msg.timeLeft)
            }
            break
          
          case 'EXPIRY_SYNC':
            // Sync absolute expiry timestamp from leader
            if (msg.expiresAt !== undefined && msg.tabId !== tabIdRef.current) {
              console.log('[TabSync] Received expiry sync:', new Date(msg.expiresAt).toISOString())
              optionsRef.current.setPreviewExpiresAt?.(msg.expiresAt)
              // Also store in localStorage for persistence
              try {
                localStorage.setItem('ft_preview_expires_at', msg.expiresAt.toString())
              } catch {}
            }
            break
          
          case 'REQUEST_TIME':
            // Another tab is asking for current time - if we're leader, respond
            if (isLeaderRef.current && msg.tabId !== tabIdRef.current) {
              channel.postMessage({
                type: 'TIMER_UPDATE',
                timeLeft: optionsRef.current.timeLeft,
                tabId: tabIdRef.current
              } as TabSyncMessage)
              // Also send expiry timestamp
              if (optionsRef.current.previewExpiresAt) {
                channel.postMessage({
                  type: 'EXPIRY_SYNC',
                  expiresAt: optionsRef.current.previewExpiresAt,
                  tabId: tabIdRef.current
                } as TabSyncMessage)
              }
            }
            break
            
          case 'PREVIEW_ENDED':
            if (msg.tabId !== tabIdRef.current) {
              console.log('[TabSync] Preview ended in another tab')
              optionsRef.current.onPreviewEnded()
            }
            break
            
          case 'LEADER_PING':
            // Another tab is the leader
            if (msg.tabId !== tabIdRef.current) {
              lastLeaderPingRef.current = Date.now()
              if (isLeaderRef.current) {
                // We were leader but someone else is now
                isLeaderRef.current = false
                setIsLeader(false)
                optionsRef.current.onLostLeadership?.()
                console.log('[TabSync] Lost leadership to:', msg.tabId)
              }
            }
            break
            
          case 'LEADER_CLAIM':
            // Another tab is claiming leadership
            if (msg.tabId !== tabIdRef.current) {
              lastLeaderPingRef.current = Date.now()
              if (isLeaderRef.current && msg.timestamp) {
                // Compare timestamps - older claim wins
                if (msg.timestamp < Date.now() - 50) {
                  isLeaderRef.current = false
                  setIsLeader(false)
                  optionsRef.current.onLostLeadership?.()
                }
              }
            }
            break
            
          case 'PROGRESS_SAVED':
            // Another tab saved progress - we don't need to
            console.log('[TabSync] Progress saved by another tab')
            break
        }
      }
      
      console.log('[TabSync] Initialized with tab ID:', tabIdRef.current)
      
      // Try to restore expiry timestamp from localStorage first
      try {
        const storedExpiresAt = localStorage.getItem('ft_preview_expires_at')
        if (storedExpiresAt) {
          const expiresAtMs = parseInt(storedExpiresAt, 10)
          if (!isNaN(expiresAtMs) && expiresAtMs > Date.now()) {
            console.log('[TabSync] Restored expiry from localStorage')
            optionsRef.current.setPreviewExpiresAt?.(expiresAtMs)
          }
        }
      } catch {}
      
      // Request current time from leader (if any exists)
      setTimeout(() => {
        channel.postMessage({
          type: 'REQUEST_TIME',
          tabId: tabIdRef.current
        } as TabSyncMessage)
      }, 100)
      
      // Try to claim leadership after a short delay
      // Use a longer random delay to reduce race conditions
      setTimeout(() => {
        claimLeadership()
      }, Math.random() * 500 + 300)
      
      return () => {
        channel.close()
        channelRef.current = null
      }
    } catch (error) {
      console.error('[TabSync] Failed to create BroadcastChannel:', error)
      isLeaderRef.current = true
      setIsLeader(true)
    }
  }, [claimLeadership]) // claimLeadership is stable
  
  // Leader pings every 2 seconds to maintain leadership
  useEffect(() => {
    if (!isLeader || !channelRef.current) return
    
    // Send immediate ping when becoming leader
    channelRef.current.postMessage({
      type: 'LEADER_PING',
      tabId: tabIdRef.current,
      timestamp: Date.now()
    } as TabSyncMessage)
    
    const pingInterval = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'LEADER_PING',
          tabId: tabIdRef.current,
          timestamp: Date.now()
        } as TabSyncMessage)
      }
    }, BROADCAST_INTERVAL_MS)
    
    return () => clearInterval(pingInterval)
  }, [isLeader])
  
  // Check for leader timeout and claim if needed
  useEffect(() => {
    if (isLeader) return
    
    const checkInterval = setInterval(() => {
      const timeSinceLastPing = Date.now() - lastLeaderPingRef.current
      if (timeSinceLastPing > LEADER_TIMEOUT_MS) {
        claimLeadership()
      }
    }, 1000)
    
    return () => clearInterval(checkInterval)
  }, [isLeader, claimLeadership])
  
  // Broadcast timer updates and expiry timestamp periodically (leader only)
  useEffect(() => {
    if (!isLeader || !channelRef.current) return
    
    const timeLeft = options.timeLeft // Get current value
    const expiresAt = options.previewExpiresAt
    
    // Broadcast immediately when becoming leader
    channelRef.current.postMessage({
      type: 'TIMER_UPDATE',
      timeLeft: timeLeft,
      tabId: tabIdRef.current
    } as TabSyncMessage)
    
    // Also broadcast expiry timestamp
    if (expiresAt) {
      channelRef.current.postMessage({
        type: 'EXPIRY_SYNC',
        expiresAt: expiresAt,
        tabId: tabIdRef.current
      } as TabSyncMessage)
    }
    
    const broadcastInterval = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'TIMER_UPDATE',
          timeLeft: optionsRef.current.timeLeft,
          tabId: tabIdRef.current
        } as TabSyncMessage)
        
        // Broadcast expiry timestamp too
        if (optionsRef.current.previewExpiresAt) {
          channelRef.current.postMessage({
            type: 'EXPIRY_SYNC',
            expiresAt: optionsRef.current.previewExpiresAt,
            tabId: tabIdRef.current
          } as TabSyncMessage)
        }
      }
    }, BROADCAST_INTERVAL_MS)
    
    return () => clearInterval(broadcastInterval)
  }, [isLeader, options.timeLeft, options.previewExpiresAt])
  
  // Broadcast preview ended
  const broadcastPreviewEnded = useCallback(() => {
    channelRef.current?.postMessage({
      type: 'PREVIEW_ENDED',
      tabId: tabIdRef.current
    } as TabSyncMessage)
  }, [])
  
  // Broadcast that progress was saved (so other tabs don't save)
  const broadcastProgressSaved = useCallback(() => {
    channelRef.current?.postMessage({
      type: 'PROGRESS_SAVED',
      tabId: tabIdRef.current
    } as TabSyncMessage)
  }, [])
  
  return {
    isLeader,
    tabId: tabIdRef.current,
    broadcastPreviewEnded,
    broadcastProgressSaved
  }
}
