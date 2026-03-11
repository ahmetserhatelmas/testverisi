'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { getSupabase } from '@/lib/supabase'
import { Session, Student, SessionAnalytics } from '@/types'
import { computeAnalytics } from '@/lib/analytics'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts'
import { formatTime } from '@/lib/useTimers'

type AdminTab = 'students' | 'sessions' | 'analytics'

interface SessionRow {
  session_id: string
  student_name: string
  started_at: string
  ended_at: string | null
  t1_session: number
  t2_hre: number
  t5_crisis: number
  initial_cab_level: number
  final_cab_level: number | null
  trial_count?: number
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('students')
  const [students, setStudents] = useState<Student[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [selectedAnalytics, setSelectedAnalytics] = useState<SessionAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.classList.add('scrollable')
    return () => document.body.classList.remove('scrollable')
  }, [])

  const loadStudents = useCallback(async () => {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }
    const { data, error: err } = await sb
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setStudents((data as Student[]) || [])
    setLoading(false)
  }, [])

  const loadSessions = useCallback(async () => {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }
    const { data, error: err } = await sb
      .from('sessions')
      .select('session_id, student_name, started_at, ended_at, t1_session, t2_hre, t5_crisis, initial_cab_level, final_cab_level')
      .order('started_at', { ascending: false })
      .limit(100)
    if (err) setError(err.message)
    else setSessions((data as SessionRow[]) || [])
    setLoading(false)
  }, [])

  const loadSessionDetail = async (sessionId: string) => {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }
    const [sessRes, trialsRes, recovRes] = await Promise.all([
      sb.from('sessions').select('*').eq('session_id', sessionId).single(),
      sb.from('trials').select('*').eq('session_id', sessionId).order('timestamp'),
      sb.from('recovery_events').select('*').eq('session_id', sessionId).order('started_at'),
    ])
    if (sessRes.error) { setError(sessRes.error.message); setLoading(false); return }
    const raw = sessRes.data as Record<string, unknown>
    const session: Session = {
      session_id: raw.session_id as string,
      student_id: raw.student_id as string,
      student_name: raw.student_name as string,
      started_at: raw.started_at as string,
      ended_at: raw.ended_at as string | null,
      initial_cab_level: raw.initial_cab_level as Session['initial_cab_level'],
      final_cab_level: raw.final_cab_level as Session['final_cab_level'],
      trials: (trialsRes.data || []).map((t: Record<string, unknown>) => ({
        trial_id: t.trial_id as string,
        session_id: t.session_id as string,
        timestamp: t.timestamp as string,
        state_at_start: t.state_at_start as Session['trials'][0]['state_at_start'],
        cab_level: t.cab_level as Session['trials'][0]['cab_level'],
        input: t.input as Session['trials'][0]['input'],
        latency: t.latency_ms as number | null,
        result_state: t.result_state as Session['trials'][0]['result_state'],
      })),
      recovery_events: (recovRes.data || []).map((r: Record<string, unknown>) => ({
        started_at: r.started_at as number,
        ended_at: r.ended_at as number | null,
        duration: r.duration_ms as number | null,
      })),
      timers: {
        t1_session: raw.t1_session as number,
        t2_hre: raw.t2_hre as number,
        t3_recovery: raw.t3_recovery as number,
        t4_latency: raw.t4_latency as number,
        t5_crisis: raw.t5_crisis as number,
      },
    }
    setSelectedSession(session)
    setSelectedAnalytics(computeAnalytics(session))
    setLoading(false)
  }

  const deleteStudent = async (id: string) => {
    if (!confirm('Bu öğrenciyi ve tüm seans verilerini sil?')) return
    const sb = getSupabase()
    if (!sb) return
    await sb.from('students').delete().eq('id', id)
    setStudents(prev => prev.filter(s => s.id !== id))
  }

  useEffect(() => {
    if (tab === 'students') loadStudents()
    else if (tab === 'sessions') loadSessions()
    else if (tab === 'analytics') loadSessions()
  }, [tab, loadStudents, loadSessions])

  return (
    <div className="min-h-dvh bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-black/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Modus" width={36} height={36} className="drop-shadow" />
          <div>
            <h1 className="font-black text-lg leading-tight">Admin Paneli</h1>
            <p className="text-white/30 text-xs">Modus DKT</p>
          </div>
        </div>
        <a href="/" className="btn-tactile text-xs text-white/40 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          ← Uygulamaya Dön
        </a>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/8">
        {([
          { id: 'students', label: '👥 Öğrenciler' },
          { id: 'sessions', label: '📋 Seanslar' },
          { id: 'analytics', label: '📊 Analitik' },
        ] as { id: AdminTab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelectedSession(null) }}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'text-green-400 border-b-2 border-green-500'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-900/40 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* ─── STUDENTS TAB ─────────────────────────────── */}
        {tab === 'students' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white/70 font-semibold text-sm uppercase tracking-wide">
                {students.length} Öğrenci
              </h2>
              <button onClick={loadStudents} className="text-xs text-white/30 px-3 py-1.5 rounded-lg bg-white/5">
                Yenile
              </button>
            </div>
            {loading ? (
              <Loader />
            ) : students.length === 0 ? (
              <Empty text="Henüz öğrenci yok. Uygulamadan seans başlatarak ekleyebilirsin." />
            ) : (
              students.map(s => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-4 py-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div>
                    <div className="text-white font-bold text-base">{s.name}</div>
                    <div className="text-white/30 text-xs mt-0.5">
                      Son Seviye: CAB {s.last_successful_level} · {new Date(s.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteStudent(s.id)}
                    className="btn-tactile text-red-400/50 hover:text-red-400 text-xs px-2 py-1 rounded-lg transition-colors"
                  >
                    Sil
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── SESSIONS TAB ─────────────────────────────── */}
        {tab === 'sessions' && !selectedSession && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white/70 font-semibold text-sm uppercase tracking-wide">
                {sessions.length} Seans
              </h2>
              <button onClick={loadSessions} className="text-xs text-white/30 px-3 py-1.5 rounded-lg bg-white/5">
                Yenile
              </button>
            </div>
            {loading ? (
              <Loader />
            ) : sessions.length === 0 ? (
              <Empty text="Henüz tamamlanmış seans yok." />
            ) : (
              sessions.map(s => {
                const hre = s.t1_session > 0 ? Math.round((s.t2_hre / s.t1_session) * 100) : 0
                return (
                  <button
                    key={s.session_id}
                    onClick={() => loadSessionDetail(s.session_id)}
                    className="btn-tactile w-full text-left px-4 py-4 rounded-2xl transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-bold text-base">{s.student_name}</div>
                        <div className="text-white/30 text-xs mt-0.5">
                          {new Date(s.started_at).toLocaleDateString('tr-TR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-sm">%{hre} HRE</div>
                        <div className="text-white/30 text-xs">{formatTime(s.t1_session)}</div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <Badge color="#22c55e" label={`CAB ${s.final_cab_level ?? s.initial_cab_level}`} />
                      {s.t5_crisis > 0 && <Badge color="#ef4444" label={`Kriz: ${formatTime(s.t5_crisis)}`} />}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* ─── SESSION DETAIL ────────────────────────────── */}
        {tab === 'sessions' && selectedSession && selectedAnalytics && (
          <SessionDetail
            session={selectedSession}
            analytics={selectedAnalytics}
            onBack={() => setSelectedSession(null)}
          />
        )}

        {/* ─── ANALYTICS TAB ────────────────────────────── */}
        {tab === 'analytics' && (
          <OverallAnalytics sessions={sessions} loading={loading} />
        )}
      </div>
    </div>
  )
}

// ─── Session Detail ───────────────────────────────────────────────────────────
function SessionDetail({ session, analytics, onBack }: {
  session: Session
  analytics: SessionAnalytics
  onBack: () => void
}) {
  const pieData = [
    { name: 'HRE', value: analytics.state_distribution.GREEN, color: '#22c55e' },
    { name: 'Toparlanma', value: analytics.state_distribution.YELLOW, color: '#eab308' },
    { name: 'Kriz', value: analytics.state_distribution.RED, color: '#ef4444' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-white/30 text-sm flex items-center gap-1 mb-2">
        ← Seans Listesi
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">{session.student_name}</h2>
          <p className="text-white/30 text-sm">
            {new Date(session.started_at).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-3 gap-2">
        <SnapCard label="HRE Skoru" value={`%${analytics.hre_score}`} color="#22c55e" />
        <SnapCard label="Zirve CAB" value={`CAB ${analytics.peak_cab_level}`} color="#3b82f6" />
        <SnapCard label="Onarım" value={`${analytics.avg_recovery_seconds}sn`} color="#f97316" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Toplam Süre" value={formatTime(session.timers.t1_session)} />
        <MetricCard label="HRE Süresi" value={formatTime(session.timers.t2_hre)} />
        <MetricCard label="Deneme Sayısı" value={`${session.trials.length}`} />
        <MetricCard label="Tolerans Endeksi" value={analytics.tolerance_index.toFixed(2)} />
      </div>

      {/* Pie */}
      <ChartBox title="Seans Kalitesi">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
              {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip formatter={v => `%${v}`} contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} itemStyle={{ color: '#fff' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4">
          {pieData.map(d => (
            <div key={d.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              <span className="text-white/40 text-xs">{d.name}: %{d.value}</span>
            </div>
          ))}
        </div>
      </ChartBox>

      {/* Mastery plot */}
      {analytics.mastery_plot.length > 0 && (
        <ChartBox title="Tolerans Çizelgesi">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={analytics.mastery_plot} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="minute" tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `${v}dk`} />
              <YAxis domain={[0.5, 4.5]} ticks={[1,2,3,4]} tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `CAB${v}`} />
              <Tooltip formatter={v => `CAB ${v}`} labelFormatter={l => `${l}. dakika`} contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} itemStyle={{ color: '#22c55e' }} />
              <Line type="monotone" dataKey="cab_level" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
      )}

      {/* Trials list */}
      {session.trials.length > 0 && (
        <ChartBox title={`Deneme Listesi (${session.trials.length})`}>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {session.trials.map((t, i) => (
              <div key={t.trial_id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/3">
                <span className="text-white/30 w-5">{i + 1}</span>
                <span className={`font-bold w-16 ${t.input === 'SUCCESS' ? 'text-green-400' : t.input === 'FAIL' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {t.input === 'SUCCESS' ? '✓ Başarı' : t.input === 'FAIL' ? '✗ Fail' : '⚠ Rıza'}
                </span>
                <span className="text-blue-400 w-12">CAB {t.cab_level}</span>
                <span className="text-white/30">{t.latency ? `${(t.latency / 1000).toFixed(1)}sn` : '—'}</span>
                <span className="text-white/20">{new Date(t.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </ChartBox>
      )}
    </div>
  )
}

// ─── Overall Analytics ───────────────────────────────────────────────────────
function OverallAnalytics({ sessions, loading }: { sessions: SessionRow[]; loading: boolean }) {
  if (loading) return <Loader />
  if (sessions.length === 0) return <Empty text="Analitik için tamamlanmış seans gerekiyor." />

  const completed = sessions.filter(s => s.ended_at)
  const avgHRE = completed.length > 0
    ? Math.round(completed.reduce((sum, s) => sum + (s.t1_session > 0 ? (s.t2_hre / s.t1_session) * 100 : 0), 0) / completed.length)
    : 0

  const studentMap = new Map<string, { name: string; count: number; totalHRE: number }>()
  completed.forEach(s => {
    const hre = s.t1_session > 0 ? (s.t2_hre / s.t1_session) * 100 : 0
    const existing = studentMap.get(s.student_name)
    if (existing) { existing.count++; existing.totalHRE += hre }
    else studentMap.set(s.student_name, { name: s.student_name, count: 1, totalHRE: hre })
  })

  const studentData = Array.from(studentMap.values()).map(s => ({
    name: s.name,
    sessions: s.count,
    avgHRE: Math.round(s.totalHRE / s.count),
  }))

  // HRE trend (last 20 sessions)
  const trendData = completed.slice(0, 20).reverse().map((s, i) => ({
    i: i + 1,
    hre: s.t1_session > 0 ? Math.round((s.t2_hre / s.t1_session) * 100) : 0,
    name: s.student_name,
  }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <SnapCard label="Toplam Seans" value={`${completed.length}`} color="#3b82f6" />
        <SnapCard label="Ort. HRE" value={`%${avgHRE}`} color="#22c55e" />
        <SnapCard label="Öğrenci" value={`${studentMap.size}`} color="#a855f7" />
      </div>

      <ChartBox title="HRE Trendi (Son 20 Seans)">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="i" tick={{ fill: '#555', fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `%${v}`} />
            <Tooltip formatter={v => `%${v}`} labelFormatter={l => `${l}. seans`} contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} itemStyle={{ color: '#22c55e' }} />
            <Line type="monotone" dataKey="hre" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartBox title="Öğrenci Bazında Ortalama HRE">
        <ResponsiveContainer width="100%" height={Math.max(120, studentData.length * 40)}>
          <BarChart data={studentData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#555', fontSize: 10 }} tickFormatter={v => `%${v}`} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} width={60} />
            <Tooltip formatter={v => `%${v}`} contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} itemStyle={{ color: '#22c55e' }} />
            <Bar dataKey="avgHRE" fill="#22c55e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </div>
  )
}

// ─── Shared UI ───────────────────────────────────────────────────────────────
function Loader() {
  return <div className="text-center py-16 text-white/20 text-sm">Yükleniyor...</div>
}
function Empty({ text }: { text: string }) {
  return <div className="text-center py-16 text-white/20 text-sm px-4">{text}</div>
}
function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}20`, color }}>
      {label}
    </span>
  )
}
function SnapCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30` }}>
      <div className="font-bold text-xl" style={{ color }}>{value}</div>
      <div className="text-white/40 text-xs mt-0.5">{label}</div>
    </div>
  )
}
function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <span className="text-white/40 text-sm">{label}</span>
      <span className="text-white font-bold text-sm">{value}</span>
    </div>
  )
}
function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h3 className="text-white/60 text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  )
}
