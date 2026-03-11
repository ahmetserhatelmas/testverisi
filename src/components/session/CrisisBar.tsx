'use client'
import { useState, useRef } from 'react'
import { useSessionStore } from '@/store/sessionStore'
import { useTimers, formatTime } from '@/lib/useTimers'

export function CrisisBar() {
  const appState = useSessionStore(s => s.appState)
  const pressRed = useSessionStore(s => s.pressRed)
  const resolveRed = useSessionStore(s => s.resolveRed)
  const softMode = useSessionStore(s => s.softMode)
  const isSessionActive = useSessionStore(s => s.isSessionActive)
  const timers = useTimers()

  const [swipeProgress, setSwipeProgress] = useState(0)
  const startX = useRef<number | null>(null)
  const activated = useRef(false)

  const isRed = appState === 'RED'

  const handleResolveRed = () => {
    setSwipeProgress(0)
    activated.current = false
    resolveRed()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRed) return
    startX.current = e.touches[0].clientX
    activated.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRed || startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    const progress = Math.min(1, Math.max(0, dx / 200))
    setSwipeProgress(progress)
    if (progress >= 1 && !activated.current) {
      activated.current = true
      pressRed()
    }
  }

  const handleTouchEnd = () => {
    if (!activated.current) setSwipeProgress(0)
    startX.current = null
  }

  // Mouse fallback for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isRed) return
    startX.current = e.clientX
    activated.current = false
    const onMove = (me: MouseEvent) => {
      if (startX.current === null) return
      const dx = me.clientX - startX.current
      const progress = Math.min(1, Math.max(0, dx / 200))
      setSwipeProgress(progress)
      if (progress >= 1 && !activated.current) {
        activated.current = true
        pressRed()
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
    }
    const onUp = () => {
      if (!activated.current) setSwipeProgress(0)
      startX.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  if (!isSessionActive) return null

  if (isRed) {
    return (
      <div className="relative overflow-hidden rounded-2xl" style={{ background: softMode ? '#7f1d1d' : '#450a0a' }}>
        <div className="absolute inset-0" style={{ background: 'rgba(239,68,68,0.15)' }} />
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-red-400 text-2xl">🚨</span>
            <div>
              <div className="text-red-300 font-bold text-sm">KRİZ MODU</div>
              <div className="timer-display font-mono text-red-400 font-bold text-xl">
                {formatTime(timers.t5)}
              </div>
            </div>
          </div>
          <button
            onClick={handleResolveRed}
            className="btn-tactile px-5 py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: softMode ? '#86efac' : '#22c55e' }}
          >
            ✓ Regüle Oldu — HRE&apos;ye Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="swipe-bar relative overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing select-none"
      style={{
        background: softMode ? '#3b0f0f' : '#1c0a0a',
        border: `1px solid ${softMode ? '#fca5a5' : '#ef444440'}`,
        height: 56,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {/* Fill */}
      <div
        className="absolute inset-y-0 left-0 transition-none"
        style={{
          width: `${swipeProgress * 100}%`,
          background: softMode
            ? 'rgba(252,165,165,0.3)'
            : 'rgba(239,68,68,0.3)',
        }}
      />
      {/* Label */}
      <div className="relative flex items-center justify-center h-full gap-2">
        <span className="text-red-400 text-sm">🚨</span>
        <span className="text-red-400 text-sm font-bold tracking-wide">
          {swipeProgress > 0.1
            ? `${Math.round(swipeProgress * 100)}%`
            : 'Kriz → Sürükle'}
        </span>
        <span className="text-red-400/50 text-xs">›</span>
      </div>
    </div>
  )
}
