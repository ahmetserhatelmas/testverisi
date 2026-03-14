'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import {
  ABCStudent,
  ABCSession,
  ABCEvent,
  ABCItem,
  InterventionRoute,
  BehaviorFunction,
} from '@/types/abc'
import {
  computeFunctionalHypothesis,
  computeInterventionAnalysis,
  detectPatterns,
  generateABCNarrative,
} from '@/lib/abcAnalytics'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const ROUTE_CONFIG: Record<InterventionRoute, { label: string; color: string }> = {
  SBT: { label: 'SBT', color: '#22c55e' },
  FCT: { label: 'FCT', color: '#3b82f6' },
  STANDARD: { label: 'Standart', color: '#a855f7' },
}

const FUNCTION_LABELS: Record<string, { label: string; color: string }> = {
  ESCAPE: { label: 'Kaçma/Kaçınma', color: '#f97316' },
  ATTENTION: { label: 'Sosyal İlgi', color: '#3b82f6' },
  TANGIBLE: { label: 'Nesne Erişimi', color: '#a855f7' },
  SENSORY: { label: 'Duyusal', color: '#ec4899' },
  UNKNOWN: { label: 'Belirsiz', color: '#6b7280' },
}

type AdminTab = 'students' | 'sessions' | 'items'

export default function AdminABCPage() {
  const [tab, setTab] = useState<AdminTab>('students')
  const [students, setStudents] = useState<ABCStudent[]>([])
  const [sessions, setSessions] = useState<ABCSession[]>([])
  const [customItems, setCustomItems] = useState<ABCItem[]>([])
  const [selectedSession, setSelectedSession] = useState<ABCSession | null>(null)
  const [events, setEvents] = useState<ABCEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingItem, setEditingItem] = useState<ABCItem | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editFunctionHint, setEditFunctionHint] = useState<BehaviorFunction | null>(null)

  useEffect(() => {
    document.body.classList.add('scrollable')
    return () => document.body.classList.remove('scrollable')
  }, [])

  const loadStudents = useCallback(async () => {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }
    const { data, error: err } = await sb
      .from('students_abc')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setStudents((data as ABCStudent[]) || [])
    setLoading(false)
  }, [])

  const loadSessions = useCallback(async () => {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }
    const { data, error: err } = await sb
      .from('abc_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100)
    if (err) setError(err.message)
    else setSessions((data as ABCSession[]) || [])
    setLoading(false)
  }, [])

  const loadSessionDetail = async (session: ABCSession) => {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }
    const { data, error: err } = await sb
      .from('abc_events')
      .select('*')
      .eq('session_id', session.id)
      .order('timestamp')
    if (err) setError(err.message)
    else setEvents((data as ABCEvent[]) || [])
    setSelectedSession(session)
    setLoading(false)
  }

  const loadCustomItems = useCallback(async () => {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }
    const { data, error: err } = await sb
      .from('abc_items')
      .select('*')
      .eq('is_custom', true)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setCustomItems((data as ABCItem[]) || [])
    setLoading(false)
  }, [])

  const deleteStudent = async (id: string) => {
    if (!confirm('Bu profili ve tüm ABC verilerini sil?')) return
    const sb = getSupabase()
    if (!sb) return
    await sb.from('students_abc').delete().eq('id', id)
    setStudents(prev => prev.filter(s => s.id !== id))
  }

  const deleteCustomItem = async (item: ABCItem) => {
    if (!confirm(`"${item.label}" öğesini silmek istediğinize emin misiniz? Geçmiş kayıtlardaki metinler değişmez.`)) return
    const sb = getSupabase()
    if (!sb) return
    const { error: err } = await sb.from('abc_items').delete().eq('id', item.id)
    if (err) setError(err.message)
    else setCustomItems(prev => prev.filter(i => i.id !== item.id))
  }

  const startEditItem = (item: ABCItem) => {
    setEditingItem(item)
    setEditLabel(item.label)
    setEditFunctionHint(item.function_hint ?? null)
  }

  const saveEditItem = async () => {
    if (!editingItem || !editLabel.trim()) return
    const sb = getSupabase()
    if (!sb) return
    const payload: { label: string; function_hint?: BehaviorFunction | null } = { label: editLabel.trim() }
    if (editingItem.category === 'antecedent') payload.function_hint = editFunctionHint
    const { error: err } = await sb.from('abc_items').update(payload).eq('id', editingItem.id)
    if (err) setError(err.message)
    else {
      setCustomItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...payload } : i))
      setEditingItem(null)
    }
  }

  useEffect(() => {
    if (tab === 'students') loadStudents()
    else if (tab === 'sessions') loadSessions()
    else if (tab === 'items') {
      loadCustomItems()
      loadStudents()
    }
  }, [tab, loadStudents, loadSessions, loadCustomItems])

  return (
    <div className="min-h-dvh bg-[#0a0a0a] text-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-black/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-white/30 text-sm flex items-center gap-1 hover:text-white/50">← Admin</Link>
          <span className="text-white/20">·</span>
          <Image src="/logo.png" alt="Modus" width={36} height={36} className="drop-shadow" />
          <div>
            <h1 className="font-black text-lg leading-tight">ABC Tracker</h1>
            <p className="text-white/30 text-xs">Profiler · Seanslar · Raporlar</p>
          </div>
        </div>
        <Link href="/" className="btn-tactile text-xs text-white/40 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          Uygulamaya Dön
        </Link>
      </div>

      <div className="flex border-b border-white/8">
        {[
          { id: 'students' as const, label: '👥 Profiller' },
          { id: 'sessions' as const, label: '📋 Seanslar' },
          { id: 'items' as const, label: '📝 Özel öğeler' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelectedSession(null) }}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'text-purple-400 border-b-2 border-purple-500'
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

        {tab === 'students' && !selectedSession && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white/70 font-semibold text-sm uppercase tracking-wide">
                {students.length} Profil
              </h2>
              <button onClick={loadStudents} className="text-xs text-white/30 px-3 py-1.5 rounded-lg bg-white/5">
                Yenile
              </button>
            </div>
            {loading ? (
              <Loader />
            ) : students.length === 0 ? (
              <Empty text="Henüz ABC profili yok. ABC Tracker uygulamasından profil oluşturabilirsin." />
            ) : (
              students.map(s => {
                const route = ROUTE_CONFIG[s.intervention_route]
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-4 py-4 rounded-2xl"
                    style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}
                  >
                    <div>
                      <div className="text-white font-bold text-base">{s.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${route.color}20`, color: route.color }}>
                          {route.label}
                        </span>
                        {s.risk_level === 'HIGH' && <span className="text-[10px] text-red-400">Yüksek Risk</span>}
                        <span className="text-white/30 text-xs">{new Date(s.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteStudent(s.id)}
                      className="btn-tactile text-red-400/50 hover:text-red-400 text-xs px-2 py-1 rounded-lg transition-colors"
                    >
                      Sil
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === 'items' && !editingItem && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white/70 font-semibold text-sm uppercase tracking-wide">
                {customItems.length} özel öğe (Diğer ile eklenenler)
              </h2>
              <button onClick={loadCustomItems} className="text-xs text-white/30 px-3 py-1.5 rounded-lg bg-white/5">
                Yenile
              </button>
            </div>
            <p className="text-white/40 text-xs mb-3">
              Yanlış yazılan veya artık kullanılmayan öğeleri düzenleyebilir veya silebilirsiniz.
            </p>
            {loading ? (
              <Loader />
            ) : customItems.length === 0 ? (
              <Empty text="Henüz Diğer ile eklenmiş öğe yok." />
            ) : (
              customItems.map(item => {
                const studentName = students.find(s => s.id === item.student_id)?.name ?? item.student_id.slice(0, 8)
                const categoryLabel = item.category === 'antecedent' ? 'Öncül (A)' : item.category === 'behavior' ? 'Davranış (B)' : 'Müdahale (C)'
                const categoryColor = item.category === 'antecedent' ? '#f97316' : item.category === 'behavior' ? '#ef4444' : '#22c55e'
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl flex-wrap"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate">{item.label}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${categoryColor}25`, color: categoryColor }}>
                          {categoryLabel}
                        </span>
                        <span className="text-white/30 text-xs">{studentName}</span>
                        {item.use_count > 0 && <span className="text-white/20 text-xs">{item.use_count} kullanım</span>}
                        {item.category === 'antecedent' && item.function_hint && (
                          <span className="text-[10px] text-white/40">{FUNCTION_LABELS[item.function_hint]?.label}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => startEditItem(item)} className="btn-tactile text-white/50 hover:text-white text-xs px-2.5 py-1.5 rounded-lg bg-white/5">
                        Düzenle
                      </button>
                      <button onClick={() => deleteCustomItem(item)} className="btn-tactile text-red-400/50 hover:text-red-400 text-xs px-2.5 py-1.5 rounded-lg">
                        Sil
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

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
              <Empty text="Henüz ABC seansı yok." />
            ) : (
              sessions.map(s => {
                const route = ROUTE_CONFIG[s.intervention_route as InterventionRoute]
                return (
                  <button
                    key={s.id}
                    onClick={() => loadSessionDetail(s)}
                    className="btn-tactile w-full text-left px-4 py-4 rounded-2xl transition-colors"
                    style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}
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
                        <div className="text-purple-400 font-bold text-sm">{s.event_count} kayıt</div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block" style={{ background: `${route.color}20`, color: route.color }}>
                          {route.label}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {selectedSession && (
          <ABCSessionReport
            session={selectedSession}
            events={events}
            onBack={() => { setSelectedSession(null); setEvents([]) }}
          />
        )}

        {/* Düzenleme modalı */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 w-full max-w-md">
              <h3 className="text-white font-bold mb-3">Öğeyi düzenle</h3>
              <input
                autoFocus
                type="text"
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                placeholder="Etiket"
                className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/25 outline-none focus:border-purple-500/60 mb-3"
              />
              {editingItem.category === 'antecedent' && (
                <div className="mb-3">
                  <label className="text-white/50 text-xs block mb-1.5">Raporda işlev</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['ESCAPE', 'ATTENTION', 'SENSORY', 'UNKNOWN'] as BehaviorFunction[]).map(fn => (
                      <button
                        key={fn}
                        type="button"
                        onClick={() => setEditFunctionHint(editFunctionHint === fn ? null : fn)}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                        style={{
                          background: editFunctionHint === fn ? `${FUNCTION_LABELS[fn].color}30` : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${editFunctionHint === fn ? FUNCTION_LABELS[fn].color : 'rgba(255,255,255,0.1)'}`,
                          color: editFunctionHint === fn ? FUNCTION_LABELS[fn].color : '#888',
                        }}
                      >
                        {FUNCTION_LABELS[fn].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setEditingItem(null) }} className="btn-tactile flex-1 py-3 rounded-xl border border-white/15 text-white/60 text-sm">
                  İptal
                </button>
                <button onClick={saveEditItem} disabled={!editLabel.trim()} className="btn-tactile flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40" style={{ background: '#a855f7' }}>
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ABCSessionReport({ session, events, onBack }: { session: ABCSession; events: ABCEvent[]; onBack: () => void }) {
  const hypothesis = computeFunctionalHypothesis(events)
  const interventions = computeInterventionAnalysis(events)
  const patterns = detectPatterns(events)
  const narrative = generateABCNarrative(session.student_name, hypothesis, interventions)

  const pieData = hypothesis.map(h => ({
    name: FUNCTION_LABELS[h.function]?.label || h.function,
    value: h.percentage,
    color: FUNCTION_LABELS[h.function]?.color || '#888',
  }))

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-white/30 text-sm flex items-center gap-1 mb-2">
        ← Seans Listesi
      </button>

      <div>
        <h2 className="text-white font-bold text-xl">{session.student_name}</h2>
        <p className="text-white/30 text-sm">
          {new Date(session.started_at).toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
          {session.ended_at && ` · Bitiş: ${new Date(session.ended_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`}
        </p>
        <div className="flex gap-2 mt-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium text-purple-400 bg-purple-500/20">
            {ROUTE_CONFIG[session.intervention_route as InterventionRoute]?.label ?? session.intervention_route}
          </span>
          <span className="text-white/40 text-xs">{events.length} ABC kaydı</span>
        </div>
      </div>

      {events.length === 0 && (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-4xl mb-3 opacity-50">📋</div>
          <h3 className="text-white font-semibold mb-1">Bu seansta hiç ABC kaydı yok</h3>
          <p className="text-white/50 text-sm max-w-sm mx-auto">
            Seans sırasında Öncül (A) → Davranış (B) → Müdahale (C) seçerek kayıt eklenir. Bu seans boş bitirilmiş; detaylı rapor için sonraki seanslarda en az bir kayıt ekleyin.
          </p>
        </div>
      )}

      {pieData.length > 0 && (
        <ChartBox title="Fonksiyonel Hipotez">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={v => `%${v}`} contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} itemStyle={{ color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-1">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-white/60 text-xs">{d.name}</span>
                <span className="font-bold text-xs" style={{ color: d.color }}>%{d.value}</span>
              </div>
            ))}
          </div>
        </ChartBox>
      )}

      {interventions.length > 0 && (
        <ChartBox title="Müdahale Verimliliği">
          <div className="space-y-2">
            {interventions.map(iv => (
              <div key={iv.consequence_label} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{iv.consequence_label}</div>
                  <div className="text-white/30 text-xs">{iv.event_count} kez · {Math.round(iv.avg_duration_ms / 1000)}sn ort.</div>
                </div>
                <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{
                  background: iv.trend === 'EFFECTIVE' ? 'rgba(34,197,94,0.2)' : iv.trend === 'RISKY' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                  color: iv.trend === 'EFFECTIVE' ? '#22c55e' : iv.trend === 'RISKY' ? '#ef4444' : '#888',
                }}>
                  {iv.trend === 'EFFECTIVE' ? '✓ Etkili' : iv.trend === 'RISKY' ? '⚠ Riskli' : 'Nötr'}
                </span>
              </div>
            ))}
          </div>
        </ChartBox>
      )}

      {patterns.length > 0 && (
        <ChartBox title="Örüntü Tespiti">
          <div className="space-y-3">
            {patterns.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-purple-400/60 text-lg mt-0.5">
                  {p.type === 'TIME_PATTERN' ? '⏱' : p.type === 'ACTIVITY_PATTERN' ? '📚' : '🔁'}
                </span>
                <div>
                  <p className="text-white/70 text-sm leading-relaxed">{p.description}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="h-1 rounded-full bg-purple-500/60" style={{ width: `${p.confidence}%`, maxWidth: 80 }} />
                    <span className="text-white/20 text-xs">%{p.confidence} güven</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartBox>
      )}

      {events.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="text-purple-400 font-bold text-sm mb-1">Sistem Değerlendirmesi</div>
              <p
                className="text-white/70 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: narrative.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
              />
            </div>
          </div>
        </div>
      )}

      {events.length > 0 && (
        <ChartBox title={`ABC Kayıtları (${events.length})`}>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {events.map((e, i) => (
              <div key={e.id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/3">
                <span className="text-white/30 w-6">{i + 1}</span>
                <span className="text-orange-400/80 truncate max-w-24" title={e.antecedent_label}>
                  {e.antecedent_unknown ? '❓' : e.antecedent_label}
                </span>
                <span className="text-red-400/80 truncate max-w-24" title={e.behavior_label}>{e.behavior_label}</span>
                <span className="text-green-400/80 truncate max-w-24" title={e.consequence_label}>{e.consequence_label}</span>
              </div>
            ))}
          </div>
        </ChartBox>
      )}

    </div>
  )
}

function Loader() {
  return <div className="text-center py-16 text-white/20 text-sm">Yükleniyor...</div>
}
function Empty({ text }: { text: string }) {
  return <div className="text-center py-16 text-white/20 text-sm px-4">{text}</div>
}
function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h3 className="text-white/60 text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  )
}
