'use client'
import { useSessionStore } from '@/store/sessionStore'
import { useTimers, formatTime } from '@/lib/useTimers'

export function LevelUpModal() {
  const levelUpPending = useSessionStore(s => s.levelUpPending)
  const cabLevel = useSessionStore(s => s.cabLevel)
  const confirmLevelUp = useSessionStore(s => s.confirmLevelUp)
  const rejectLevelUp = useSessionStore(s => s.rejectLevelUp)

  if (!levelUpPending) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl">
      <div className="bg-gray-900 border border-green-500/40 rounded-2xl p-6 mx-4 max-w-sm w-full text-center shadow-2xl">
        <div className="text-4xl mb-3">🎯</div>
        <h2 className="text-white font-bold text-lg mb-1">Tolerans Arttı!</h2>
        <p className="text-white/60 text-sm mb-4">
          Üst üste 3 başarı. CAB {cabLevel + 1} seviyesine geçmek istiyor musunuz?
        </p>
        <div className="flex gap-3">
          <button
            onClick={rejectLevelUp}
            className="btn-tactile flex-1 py-3 rounded-xl border border-white/20 text-white/70 text-sm font-medium"
          >
            Hayır, Devam Et
          </button>
          <button
            onClick={confirmLevelUp}
            className="btn-tactile flex-1 py-3 rounded-xl font-bold text-sm text-black"
            style={{ background: '#22c55e' }}
          >
            Evet, CAB {cabLevel + 1}
          </button>
        </div>
      </div>
    </div>
  )
}

export function YellowAlert() {
  const appState = useSessionStore(s => s.appState)
  const cabLevel = useSessionStore(s => s.cabLevel)
  const timers = useTimers()

  if (appState !== 'YELLOW') return null

  return (
    <div className="absolute top-16 inset-x-4 z-40 pointer-events-none">
      <div className="bg-yellow-900/80 border border-yellow-500/60 rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-sm">
        <span className="text-yellow-400 blink text-xl">⚠️</span>
        <div className="flex-1">
          <div className="text-yellow-300 font-bold text-sm blink">Talebi Geri Çek! HRE&apos;yi Onar!</div>
          <div className="text-yellow-400/70 text-xs">Alt Basamağa Dönüldü → CAB {cabLevel}</div>
        </div>
        <div className="text-right">
          <div className="text-yellow-400/50 text-[10px]">Toparlanma</div>
          <div className="timer-display font-mono text-yellow-400 font-bold text-base">
            {formatTime(timers.t3)}
          </div>
        </div>
      </div>
    </div>
  )
}
