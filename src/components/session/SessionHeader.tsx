'use client'
import Image from 'next/image'
import { useSessionStore } from '@/store/sessionStore'
import { useTimers, formatTime } from '@/lib/useTimers'

const CAB_LABELS: Record<number, string> = {
  1: 'Düşük Talep',
  2: 'Orta Talep',
  3: 'Yüksek Talep',
  4: 'Akademik Hedef',
}

export function SessionHeader() {
  const student = useSessionStore(s => s.student)
  const cabLevel = useSessionStore(s => s.cabLevel)
  const consecutiveSuccesses = useSessionStore(s => s.consecutiveSuccesses)
  const appState = useSessionStore(s => s.appState)
  const softMode = useSessionStore(s => s.softMode)
  const timers = useTimers()

  const stateColor =
    appState === 'GREEN' ? (softMode ? '#86efac' : '#22c55e') :
    appState === 'YELLOW' ? (softMode ? '#fde68a' : '#eab308') :
    (softMode ? '#fca5a5' : '#ef4444')

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm border-b border-white/10">
      {/* Left: Logo + Student + CAB */}
      <div className="flex items-center gap-2 min-w-0">
        <Image src="/logo.png" alt="Modus" width={32} height={32} className="shrink-0 drop-shadow" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-white font-bold text-lg leading-tight truncate">
            {student?.name ?? '—'}
          </span>
          <span className="text-xs font-medium" style={{ color: stateColor }}>
            CAB {cabLevel} · {CAB_LABELS[cabLevel]}
          </span>
        </div>
      </div>

      {/* Center: Progress squares (3-1 rule) */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`progress-square w-5 h-5 rounded border-2 border-green-500/40 ${i < consecutiveSuccesses ? 'filled' : 'bg-transparent'}`}
            />
          ))}
        </div>
        <span className="text-xs text-green-400/60 font-medium">{consecutiveSuccesses}/3</span>
      </div>

      {/* Right: Timers */}
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Seans</span>
            <span className="timer-display text-white font-mono font-bold text-sm">
              {formatTime(timers.t1)}
            </span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-green-400/60 uppercase tracking-wider">HRE</span>
            <span className="timer-display font-mono font-bold text-sm" style={{ color: softMode ? '#86efac' : '#22c55e' }}>
              {formatTime(timers.t2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
