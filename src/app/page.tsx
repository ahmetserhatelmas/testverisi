'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useSessionStore } from '@/store/sessionStore'
import { SessionHeader } from '@/components/session/SessionHeader'
import { MainDashboard } from '@/components/session/MainDashboard'
import { CrisisBar } from '@/components/session/CrisisBar'
import { LevelUpModal, YellowAlert } from '@/components/session/Overlays'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { Session, Student, CABLevel } from '@/types'
import { syncSessionToSupabase } from '@/lib/sync'
import { getSupabase } from '@/lib/supabase'

type Screen = 'start' | 'session' | 'analytics'

export default function Home() {
  const [screen, setScreen] = useState<Screen>('start')
  const [completedSession, setCompletedSession] = useState<Session | null>(null)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const { appState, softMode, isSessionActive, startSession, endSession, toggleSoftMode, levelUpPending } = useSessionStore()

  useEffect(() => {
    const handleVisibility = () => {}
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const glowClass =
    appState === 'GREEN' ? 'glow-frame-green' :
    appState === 'YELLOW' ? 'glow-frame-yellow' :
    'glow-frame-red'

  const bgGradient =
    appState === 'GREEN'
      ? softMode ? 'from-green-950/30 to-black' : 'from-green-950/50 to-black'
      : appState === 'YELLOW'
      ? softMode ? 'from-yellow-950/30 to-black' : 'from-yellow-950/60 to-black'
      : softMode ? 'from-red-950/40 to-black' : 'from-red-950/80 to-black'

  const handleStartSession = (student: Student) => {
    startSession(student, student.last_successful_level)
    setScreen('session')
  }

  const handleEndSession = () => {
    const session = endSession()
    if (session) {
      try {
        const stored = JSON.parse(localStorage.getItem('modus_sessions') || '[]')
        stored.push(session)
        localStorage.setItem('modus_sessions', JSON.stringify(stored))
      } catch { /* storage unavailable */ }
      syncSessionToSupabase(session)
      setCompletedSession(session)
      setShowEndConfirm(false)
      setScreen('analytics')
    }
  }

  if (screen === 'start') {
    return <StartScreen onStart={handleStartSession} />
  }

  if (screen === 'analytics' && completedSession) {
    return (
      <AnalyticsDashboard
        session={completedSession}
        onClose={() => { setScreen('start'); setCompletedSession(null) }}
      />
    )
  }

  return (
    <div
      className={`${softMode ? 'soft-mode' : ''} ${glowClass} relative flex flex-col bg-gradient-to-b ${bgGradient} transition-all duration-500`}
      style={{ height: '100dvh', overflow: 'hidden' }}
    >
      <YellowAlert />
      {levelUpPending && <LevelUpModal />}

      {/* Seans Bitir Onay Dialog */}
      {showEndConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-none">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 mx-4 max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-3">⏹️</div>
            <h2 className="text-white font-bold text-lg mb-1">Seansı Bitir?</h2>
            <p className="text-white/50 text-sm mb-5">
              Seans verileri kaydedilecek ve analitik raporu gösterilecek.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="btn-tactile flex-1 py-3 rounded-xl border border-white/15 text-white/60 text-sm font-medium"
              >
                Devam Et
              </button>
              <button
                onClick={handleEndSession}
                className="btn-tactile flex-1 py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}
              >
                Evet, Bitir
              </button>
            </div>
          </div>
        </div>
      )}
      <SessionHeader />
      <div className="flex-1 flex flex-col gap-2 p-3 min-h-0 overflow-hidden">
        <MainDashboard />
        <CrisisBar />
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-t border-white/5">
        <button
          onClick={toggleSoftMode}
          className="btn-tactile text-xs text-white/40 px-3 py-1.5 rounded-lg bg-white/5"
        >
          {softMode ? '🌙 Soft Mod' : '☀️ Normal'}
        </button>
        <button
          onClick={() => setShowEndConfirm(true)}
          className="btn-tactile text-xs font-medium text-red-400 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20"
        >
          Seansı Bitir
        </button>
      </div>
    </div>
  )
}

// ─── Start Screen ────────────────────────────────────────────────────────────

type StartStep = 'home' | 'select' | 'newStudent'

function StartScreen({ onStart }: { onStart: (s: Student) => void }) {
  const [step, setStep] = useState<StartStep>('home')
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadStudents = async () => {
    setLoading(true)
    setError('')
    const sb = getSupabase()
    if (!sb) {
      setLoading(false)
      return
    }
    const { data, error: err } = await sb
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setStudents((data as Student[]) || [])
    setLoading(false)
  }

  const handleSelectStep = () => {
    setStep('select')
    loadStudents()
  }

  const handleCreateStudent = async () => {
    if (!newName.trim()) return
    setSaving(true)
    setError('')
    const sb = getSupabase()
    if (sb) {
      const { data, error: err } = await sb
        .from('students')
        .insert({ name: newName.trim(), last_successful_level: 1 })
        .select()
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onStart(data as Student)
    } else {
      // Offline fallback
      const student: Student = {
        id: crypto.randomUUID(),
        name: newName.trim(),
        last_successful_level: 1,
        created_at: new Date().toISOString(),
      }
      onStart(student)
    }
    setSaving(false)
  }

  if (step === 'select') {
    return (
      <div className="flex flex-col items-center min-h-dvh bg-[#0a0a0a] px-5 pt-8">
        <button onClick={() => setStep('home')} className="self-start text-white/30 text-sm mb-6 flex items-center gap-1">
          ← Geri
        </button>
        <Image src="/logo.png" alt="Modus DKT" width={72} height={72} className="mb-4 drop-shadow-lg" />
        <h2 className="text-white font-bold text-xl mb-1">Öğrenci Seç</h2>
        <p className="text-white/30 text-sm mb-6">veya yeni öğrenci ekle</p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {loading ? (
          <div className="text-white/30 text-sm mt-8">Yükleniyor...</div>
        ) : (
          <div className="w-full max-w-xs space-y-2 mb-4">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => onStart(s)}
                className="btn-tactile w-full flex items-center justify-between px-4 py-4 rounded-2xl text-left"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div>
                  <div className="text-white font-bold text-base">{s.name}</div>
                  <div className="text-white/40 text-xs mt-0.5">Son Seviye: CAB {s.last_successful_level}</div>
                </div>
                <span className="text-white/20 text-lg">›</span>
              </button>
            ))}
            {students.length === 0 && (
              <p className="text-white/20 text-sm text-center py-4">Henüz öğrenci yok</p>
            )}
          </div>
        )}

        <button
          onClick={() => setStep('newStudent')}
          className="btn-tactile w-full max-w-xs py-4 rounded-2xl font-bold text-sm text-white/70 border border-white/15 mt-2"
        >
          + Yeni Öğrenci Ekle
        </button>
      </div>
    )
  }

  if (step === 'newStudent') {
    return (
      <div className="flex flex-col items-center min-h-dvh bg-[#0a0a0a] px-5 pt-8">
        <button onClick={() => setStep('select')} className="self-start text-white/30 text-sm mb-6 flex items-center gap-1">
          ← Geri
        </button>
        <Image src="/logo.png" alt="Modus DKT" width={72} height={72} className="mb-4 drop-shadow-lg" />
        <h2 className="text-white font-bold text-xl mb-1">Yeni Öğrenci</h2>
        <p className="text-white/30 text-sm mb-8">İsim gir ve seansı başlat</p>

        <div className="w-full max-w-xs space-y-4">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateStudent()}
            placeholder="Öğrenci adı (örn: Uzay)"
            autoFocus
            className="w-full px-4 py-4 rounded-2xl bg-white/8 border border-white/15 text-white placeholder-white/25 text-base outline-none focus:border-green-500/60 transition-colors"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={handleCreateStudent}
            disabled={!newName.trim() || saving}
            className="btn-tactile w-full py-5 rounded-2xl font-black text-lg text-black disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              boxShadow: newName.trim() ? '0 0 30px rgba(34,197,94,0.4)' : 'none',
            }}
          >
            {saving ? 'Kaydediliyor...' : 'Seansı Başlat'}
          </button>
        </div>
      </div>
    )
  }

  // Home
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[#0a0a0a] px-6 text-center">
      <div className="mb-8">
        <Image src="/logo.png" alt="Modus DKT" width={100} height={100} className="mx-auto mb-5 drop-shadow-2xl" />
        <h1 className="text-white font-black text-3xl tracking-tight">MODUS</h1>
        <p className="text-white/40 text-sm mt-1">Today&apos;s ABA · Assent-Based Practice</p>
      </div>

      <div className="w-full max-w-xs space-y-3 mb-8">
        <div className="rounded-2xl p-4 text-left" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">😊</span>
            <span className="text-green-400 font-bold text-sm">HRE Modu</span>
          </div>
          <p className="text-white/40 text-xs">Mutlu · Rahat · Katılımcı öğrenme ortamı</p>
        </div>
        <div className="rounded-2xl p-4 text-left" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🤫</span>
            <span className="text-yellow-400 font-bold text-sm">Assent-Based Yaklaşım</span>
          </div>
          <p className="text-white/40 text-xs">Rıza kaybında talebi geri çek, güven inşa et</p>
        </div>
        <div className="rounded-2xl p-4 text-left" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📊</span>
            <span className="text-blue-400 font-bold text-sm">CAB 1-4 Basamakları</span>
          </div>
          <p className="text-white/40 text-xs">Otomatik seviye yönetimi ve bilimsel raporlama</p>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleSelectStep}
          className="btn-tactile w-full py-5 rounded-2xl font-black text-lg text-black"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 0 30px rgba(34,197,94,0.4)',
          }}
        >
          Seansı Başlat
        </button>
        <a
          href="/admin"
          className="btn-tactile w-full py-3.5 rounded-2xl font-bold text-sm text-white/60 border border-white/10 flex items-center justify-center gap-2 no-underline"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <span>🗂️</span> Admin Paneli
        </a>
      </div>
    </div>
  )
}
