'use client'
import { useState, useEffect, useRef } from 'react'
import { useSessionStore } from '@/store/sessionStore'

export function useTimers() {
  const [now, setNow] = useState(Date.now())
  const getElapsedTimers = useSessionStore(s => s.getElapsedTimers)
  const isSessionActive = useSessionStore(s => s.isSessionActive)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isSessionActive) return
    const tick = () => {
      setNow(Date.now())
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isSessionActive])

  const elapsed = getElapsedTimers(now)
  return elapsed
}

export function formatTime(ms: number, showMs = false): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  if (showMs) {
    const ms100 = Math.floor((ms % 1000) / 100)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms100}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
