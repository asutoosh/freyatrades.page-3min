'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * BroadcastChannel-based multi-tab synchronization
 * Ensures timers stay in sync across all open tabs
 * 
 * Key behaviors:
 * - Leader election: First tab becomes leader, others follow
 * - Timer sync: Leader broadcasts time every 2 seconds
 * - All tabs run their own timer for responsiveness, but sync from leader
 * - Only leader saves progress to server
 */

interface TabSyncMessage {
  type: 'TIMER_UPDATE' | 'PREVIEW_ENDED' | 'LEADER_PING' | 'LEADER_CLAIM' | 'PROGRESS_SAVED'
  timeLeft?: number
  tabId?: string
  timestamp?: number
}

const CHANNEL_NAME = 'freya_preview_sync'
const LEADER_TIMEOUT_MS = 3000 // If no leader ping for 3s, claim leadership
const BROADCAST_INTERVAL_MS = 2000 // Sync timer every 2 seconds

export function useTabSync(options: {
  timeLeft: number
  setTimeLeft: (time: number | ((prev: number) => number)) => void
  onPreviewEnded: () => void
  onBecameLeader?: () => void
  onLostLeadership?: () => void
}) {
  const { timeLeft, setTimeLeft, onPreviewEnded, onBecameLeader, onLostLeadership } = options
  
  const channelRef = useRef<BroadcastChannel | null>(null)
  const tabIdRef = useRef<string>(`tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const isLeaderRef = useRef(false)
  const lastLeaderPingRef = useRef<number>(Date.now())
  const [isLeader, setIsLeader] = useState(false)
  const claimLeadershipRef = useRef<() => void>(() => {})
  
  // Claim leadership function
  const claimLeadership = useCallback(() => {
    if (!channelRef.current) {
      // No channel means we're the only tab or BroadcastChannel not supported
      isLeaderRef.current = true
      setIsLeader(true)
      onBecameLeader?.()
      return
    }
    
    // Check if current leader is still active
    const timeSinceLastPing = Date.now() - lastLeaderPingRef.current
    
    if (timeSinceLastPing > LEADER_TIMEOUT_MS) {
      isLeaderRef.current = true
      setIsLeader(true)
      onBecameLeader?.()
      console.log('[TabSync] Claimed leadership')
      
      // Announce leadership
      channelRef.current.postMessage({
        type: 'LEADER_CLAIM',
        tabId: tabIdRef.current,
        timestamp: Date.now()
      } as TabSyncMessage)
    }
  }, [onBecameLeader])
  
  // Keep ref updated
  useEffect(() => {
    claimLeadershipRef.current = claimLeadership
  }, [claimLeadership])
  
  // Initialize BroadcastChannel
  useEffect(() => {
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
              setTimeLeft(msg.timeLeft)
            }
            break
            
          case 'PREVIEW_ENDED':
            if (msg.tabId !== tabIdRef.current) {
              console.log('[TabSync] Preview ended in another tab')
              onPreviewEnded()
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
                onLostLeadership?.()
                console.log('[TabSync] Lost leadership to:', msg.tabId)
              }
            }
            break
            
          case 'LEADER_CLAIM':
            // Another tab is claiming leadership
            if (msg.tabId !== tabIdRef.current) {
              lastLeaderPingRef.current = Date.now()
              if (isLeaderRef.current) {
                // Compare timestamps - older claim wins
                if (msg.timestamp && msg.timestamp < Date.now() - 50) {
                  isLeaderRef.current = false
                  setIsLeader(false)
                  onLostLeadership?.()
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
      
      // Try to claim leadership on mount (with random delay to avoid race)
      const claimTimeout = setTimeout(() => {
        claimLeadershipRef.current()
      }, Math.random() * 300 + 100)
      
      console.log('[TabSync] Initialized with tab ID:', tabIdRef.current)
      
      return () => {
        clearTimeout(claimTimeout)
        channel.close()
        channelRef.current = null
      }
    } catch (error) {
      console.error('[TabSync] Failed to create BroadcastChannel:', error)
      isLeaderRef.current = true
      setIsLeader(true)
    }
  }, [setTimeLeft, onPreviewEnded, onLostLeadership])
  
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
      channelRef.current?.postMessage({
        type: 'LEADER_PING',
        tabId: tabIdRef.current,
        timestamp: Date.now()
      } as TabSyncMessage)
    }, BROADCAST_INTERVAL_MS)
    
    return () => clearInterval(pingInterval)
  }, [isLeader])
  
  // Check for leader timeout and claim if needed
  useEffect(() => {
    if (isLeader) return
    
    const checkInterval = setInterval(() => {
      const timeSinceLastPing = Date.now() - lastLeaderPingRef.current
      if (timeSinceLastPing > LEADER_TIMEOUT_MS) {
        claimLeadershipRef.current()
      }
    }, 1000)
    
    return () => clearInterval(checkInterval)
  }, [isLeader])
  
  // Broadcast timer updates periodically (leader only)
  useEffect(() => {
    if (!isLeader || !channelRef.current) return
    
    const broadcastInterval = setInterval(() => {
      channelRef.current?.postMessage({
        type: 'TIMER_UPDATE',
        timeLeft: timeLeft,
        tabId: tabIdRef.current
      } as TabSyncMessage)
    }, BROADCAST_INTERVAL_MS)
    
    return () => clearInterval(broadcastInterval)
  }, [isLeader, timeLeft])
  
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

