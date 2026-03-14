'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import { SessionHeader } from '@/components/session/SessionHeader'
import { MainDashboard } from '@/components/session/MainDashboard'
import { CrisisBar } from '@/components/session/CrisisBar'
import { LevelUpModal, YellowAlert } from '@/components/session/Overlays'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { Session, Student } from '@/types'
import { syncSessionToSupabase } from '@/lib/sync'
import { getSupabase } from '@/lib/supabase'

type Step = 'select' | 'newStudent' | 'session' | 'analytics'

export default function DKTPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('select')
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [completedSession, setCompletedSession] = useState<Session | null>(null)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const { appState, softMode, startSession, endSession, toggleSoftMode, levelUpPending } = useSessionStore()

  const loadStudents = async () => {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }
    const { data, error: err } = await sb.from('students').select('*').order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setStudents((data as Student[]) || [])
    setLoading(false)
  }

  useEffect(() => { loadStudents() }, [])

  const handleStart = (student: Student) => {
    startSession(student, student.last_successful_level)
    setStep('session')
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const sb = getSupabase()
    if (sb) {
      const { data, error: err } = await sb.from('students').insert({ name: newName.trim(), last_successful_level: 1 }).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      handleStart(data as Student)
    } else {
      handleStart({ id: crypto.randomUUID(), name: newName.trim(), last_successful_level: 1, created_at: new Date().toISOString() })
    }
    setSaving(false)
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
      setStep('analytics')
    }
  }

  const glowClass = appState === 'GREEN' ? 'glow-frame-green' : appState === 'YELLOW' ? 'glow-frame-yellow' : 'glow-frame-red'
  const bgGradient = appState === 'GREEN' ? (softMode ? 'from-green-950/30 to-black' : 'from-green-950/50 to-black') :
    appState === 'YELLOW' ? (softMode ? 'from-yellow-950/30 to-black' : 'from-yellow-950/60 to-black') :
    (softMode ? 'from-red-950/40 to-black' : 'from-red-950/80 to-black')

  if (step === 'analytics' && completedSession) {
    return <AnalyticsDashboard session={completedSession} onClose={() => router.push('/')} />
  }

  if (step === 'session') {
    return (
      <div className={`${softMode ? 'soft-mode' : ''} ${glowClass} relative flex flex-col bg-gradient-to-b ${bgGradient} transition-all duration-500`} style={{ height: '100dvh', overflow: 'hidden' }}>
        <YellowAlert />
        {levelUpPending && <LevelUpModal />}
        {showEndConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 mx-4 max-w-sm w-full text-center shadow-2xl">
              <div className="text-4xl mb-3">⏹️</div>
              <h2 className="text-white font-bold text-lg mb-1">Seansı Bitir?</h2>
              <p className="text-white/50 text-sm mb-5">Seans verileri kaydedilecek ve analitik raporu gösterilecek.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowEndConfirm(false)} className="btn-tactile flex-1 py-3 rounded-xl border border-white/15 text-white/60 text-sm font-medium">Devam Et</button>
                <button onClick={handleEndSession} className="btn-tactile flex-1 py-3 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>Evet, Bitir</button>
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
          <button onClick={toggleSoftMode} className="btn-tactile text-xs text-white/40 px-3 py-1.5 rounded-lg bg-white/5">{softMode ? '🌙 Soft Mod' : '☀️ Normal'}</button>
          <button onClick={() => setShowEndConfirm(true)} className="btn-tactile text-xs font-medium text-red-400 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">Seansı Bitir</button>
        </div>
      </div>
    )
  }

  if (step === 'newStudent') {
    return (
      <div className="flex flex-col items-center min-h-dvh bg-[#0a0a0a] px-5 pt-8">
        <button onClick={() => setStep('select')} className="self-start text-white/30 text-sm mb-6">← Geri</button>
        <Image src="/logo.png" alt="Modus" width={64} height={64} className="mb-4 drop-shadow-lg" />
        <h2 className="text-white font-bold text-xl mb-1">Yeni Öğrenci</h2>
        <p className="text-white/30 text-sm mb-8">İsim gir ve seansı başlat</p>
        <div className="w-full max-w-xs space-y-4">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="Öğrenci adı" autoFocus className="w-full px-4 py-4 rounded-2xl bg-white/8 border border-white/15 text-white placeholder-white/25 text-base outline-none focus:border-green-500/60 transition-colors" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button onClick={handleCreate} disabled={!newName.trim() || saving} className="btn-tactile w-full py-5 rounded-2xl font-black text-lg text-black disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: newName.trim() ? '0 0 30px rgba(34,197,94,0.4)' : 'none' }}>
            {saving ? 'Kaydediliyor...' : 'Seansı Başlat'}
          </button>
        </div>
      </div>
    )
  }

  // Select screen
  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0a] px-5 pt-8">
      <button onClick={() => router.push('/')} className="text-white/30 text-sm mb-6 flex items-center gap-1 self-start">← Ana Sayfa</button>
      <div className="text-center mb-6">
        <Image src="/logo.png" alt="Modus" width={64} height={64} className="mx-auto mb-3 drop-shadow-lg" />
        <h2 className="text-white font-bold text-xl">Modus DKT</h2>
        <p className="text-white/30 text-sm">Seans Operasyonu</p>
      </div>
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      {loading ? <div className="text-white/30 text-sm text-center mt-8">Yükleniyor...</div> : (
        <div className="space-y-2 mb-4">
          {students.map(s => (
            <button key={s.id} onClick={() => handleStart(s)} className="btn-tactile w-full flex items-center justify-between px-4 py-4 rounded-2xl text-left" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div>
                <div className="text-white font-bold">{s.name}</div>
                <div className="text-white/40 text-xs mt-0.5">Son Seviye: CAB {s.last_successful_level}</div>
              </div>
              <span className="text-green-400/40">›</span>
            </button>
          ))}
          {students.length === 0 && <p className="text-white/20 text-sm text-center py-4">Henüz öğrenci yok</p>}
        </div>
      )}
      <button onClick={() => setStep('newStudent')} className="btn-tactile w-full py-4 rounded-2xl font-bold text-sm text-white/70 border border-white/15">
        + Yeni Öğrenci Ekle
      </button>
    </div>
  )
}
