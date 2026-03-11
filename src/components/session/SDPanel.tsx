'use client'
import { useSessionStore } from '@/store/sessionStore'
import { useTimers, formatTime } from '@/lib/useTimers'

export function SDPanel() {
  const appState = useSessionStore(s => s.appState)
  const sdActive = useSessionStore(s => s.sdActive)
  const pressSD = useSessionStore(s => s.pressSD)
  const pressSuccess = useSessionStore(s => s.pressSuccess)
  const pressFail = useSessionStore(s => s.pressFail)
  const cabLevel = useSessionStore(s => s.cabLevel)
  const softMode = useSessionStore(s => s.softMode)
  const timers = useTimers()

  const isGreen = appState === 'GREEN'
  const blueColor = softMode ? '#93c5fd' : '#3b82f6'

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{ background: softMode ? '#1e3a5f' : '#1e3a5f' }}
    >
      {/* SD Button */}
      <button
        onClick={pressSD}
        disabled={!isGreen || sdActive}
        className="btn-tactile flex-1 flex flex-col items-center justify-center gap-1 transition-opacity disabled:opacity-40"
        style={{
          background: sdActive
            ? (softMode ? 'rgba(147,197,253,0.15)' : 'rgba(59,130,246,0.25)')
            : (softMode ? 'rgba(147,197,253,0.08)' : 'rgba(59,130,246,0.12)'),
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span className="text-3xl">📋</span>
        <span className="text-sm font-bold text-white">SD</span>
        <span className="text-[10px] text-white/50">Yönerge Verildi</span>
        {sdActive && (
          <span className="timer-display font-mono text-lg font-bold" style={{ color: blueColor }}>
            {formatTime(timers.t4, true)}
          </span>
        )}
      </button>

      {/* Success / Fail buttons */}
      <div className="flex flex-1">
        <button
          onClick={pressSuccess}
          disabled={!isGreen}
          className="btn-tactile flex-1 flex flex-col items-center justify-center gap-1 transition-opacity disabled:opacity-30"
          style={{ background: softMode ? 'rgba(134,239,172,0.12)' : 'rgba(34,197,94,0.15)' }}
        >
          <span className="text-3xl font-black" style={{ color: softMode ? '#86efac' : '#22c55e' }}>+</span>
          <span className="text-[11px] text-white/60">Başarılı</span>
        </button>
        <div className="w-px bg-white/10" />
        <button
          onClick={pressFail}
          disabled={!isGreen}
          className="btn-tactile flex-1 flex flex-col items-center justify-center gap-1 transition-opacity disabled:opacity-30"
          style={{ background: 'rgba(239,68,68,0.1)' }}
        >
          <span className="text-3xl font-black text-red-400">−</span>
          <span className="text-[11px] text-white/60">Destekli</span>
        </button>
      </div>
    </div>
  )
}
