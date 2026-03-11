'use client'
import { useSessionStore } from '@/store/sessionStore'
import { SDPanel } from './SDPanel'

const CAB_DESCRIPTIONS: Record<number, string> = {
  1: 'Bekleme / Basit Onay',
  2: 'Tek Adım Görev',
  3: 'Çok Adımlı Görev',
  4: 'Akademik / Hedef',
}

export function MainDashboard() {
  const appState = useSessionStore(s => s.appState)
  const pressGreen = useSessionStore(s => s.pressGreen)
  const pressYellow = useSessionStore(s => s.pressYellow)
  const pressFCT = useSessionStore(s => s.pressFCT)
  const softMode = useSessionStore(s => s.softMode)
  const cabLevel = useSessionStore(s => s.cabLevel)

  const isRed = appState === 'RED'
  const isYellow = appState === 'YELLOW'

  const greenBg = softMode
    ? 'rgba(134,239,172,0.12)'
    : appState === 'GREEN' ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.06)'
  const yellowBg = softMode
    ? 'rgba(253,230,138,0.12)'
    : appState === 'YELLOW' ? 'rgba(234,179,8,0.25)' : 'rgba(234,179,8,0.06)'
  const fctBg = softMode
    ? 'rgba(251,191,36,0.12)'
    : 'rgba(249,115,22,0.15)'

  const greenGlow = appState === 'GREEN'
    ? (softMode ? '0 0 20px rgba(134,239,172,0.3)' : '0 0 30px rgba(34,197,94,0.4)')
    : 'none'
  const yellowGlow = appState === 'YELLOW'
    ? (softMode ? '0 0 20px rgba(253,230,138,0.3)' : '0 0 30px rgba(234,179,8,0.4)')
    : 'none'

  return (
    <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
      {/* GREEN - HRE */}
      <button
        onClick={pressGreen}
        disabled={appState === 'GREEN' || isRed || isYellow}
        className="btn-tactile rounded-2xl flex flex-col items-center justify-center gap-2 transition-all disabled:cursor-default"
        style={{
          background: greenBg,
          boxShadow: greenGlow,
          border: `2px solid ${appState === 'GREEN' ? (softMode ? '#86efac' : '#22c55e') : 'transparent'}`,
          opacity: isRed ? 0.3 : isYellow ? 0.25 : 1,
        }}
      >
        <span className="text-5xl">😊</span>
        <span className="font-bold text-base" style={{ color: softMode ? '#86efac' : '#22c55e' }}>
          HRE
        </span>
        <span className="text-white/50 text-xs text-center px-2">
          Mutlu · Rahat · Katılımcı
        </span>
        {appState === 'GREEN' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: softMode ? 'rgba(134,239,172,0.2)' : 'rgba(34,197,94,0.2)', color: softMode ? '#86efac' : '#22c55e' }}>
            ● AKTİF
          </span>
        )}
        {isYellow && (
          <span className="text-[10px] px-2 py-0.5 rounded-full text-white/30">
            FCT ile dön
          </span>
        )}
      </button>

      {/* YELLOW - Fısıltı */}
      <button
        onClick={pressYellow}
        disabled={appState === 'YELLOW' || isRed}
        className="btn-tactile rounded-2xl flex flex-col items-center justify-center gap-2 transition-all disabled:cursor-default"
        style={{
          background: yellowBg,
          boxShadow: yellowGlow,
          border: `2px solid ${appState === 'YELLOW' ? (softMode ? '#fde68a' : '#eab308') : 'transparent'}`,
          opacity: isRed ? 0.3 : 1,
        }}
      >
        <span className="text-5xl">🤫</span>
        <span className="font-bold text-base" style={{ color: softMode ? '#fde68a' : '#eab308' }}>
          FISILTI
        </span>
        <span className="text-white/50 text-xs text-center px-2">
          Rıza Kaybı · Talep Geri Çek
        </span>
        {appState === 'YELLOW' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full blink" style={{ background: softMode ? 'rgba(253,230,138,0.2)' : 'rgba(234,179,8,0.2)', color: softMode ? '#fde68a' : '#eab308' }}>
            ● AKTİF
          </span>
        )}
      </button>

      {/* SD Panel */}
      <SDPanel />

      {/* FCT */}
      <button
        onClick={pressFCT}
        disabled={appState !== 'YELLOW'}
        className="btn-tactile rounded-2xl flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-40"
        style={{
          background: fctBg,
          border: `2px solid ${appState === 'YELLOW' ? (softMode ? '#fbbf24' : '#f97316') : 'transparent'}`,
        }}
      >
        <span className="text-5xl">💬</span>
        <span className="font-bold text-base" style={{ color: softMode ? '#fbbf24' : '#f97316' }}>
          FCT
        </span>
        <span className="text-white/50 text-xs text-center px-2">
          İletişim · HRE&apos;ye Dön
        </span>
        {appState === 'YELLOW' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>
            ● BASIN
          </span>
        )}
      </button>
    </div>
  )
}
