'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getSupabase } from '@/lib/supabase'
import { ABCStudent, ABCItem, ABCEvent, ABCSession, InterventionRoute, BehaviorFunction } from '@/types/abc'
import { computeFunctionalHypothesis, computeInterventionAnalysis, detectPatterns, generateABCNarrative } from '@/lib/abcAnalytics'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

type ABCStep = 'A' | 'B' | 'C'

const FUNCTION_LABELS: Record<string, { label: string; color: string }> = {
  ESCAPE: { label: 'Kaçma/Kaçınma', color: '#f97316' },
  ATTENTION: { label: 'Sosyal İlgi', color: '#3b82f6' },
  TANGIBLE: { label: 'Nesne Erişimi', color: '#a855f7' },
  SENSORY: { label: 'Duyusal', color: '#ec4899' },
  UNKNOWN: { label: 'Belirsiz', color: '#6b7280' },
}

const ROUTE_CONFIG: Record<InterventionRoute, { label: string; color: string; description: string }> = {
  SBT: { label: 'SBT', color: '#22c55e', description: 'Skill Based Treatment · Sönmesiz' },
  FCT: { label: 'FCT', color: '#3b82f6', description: 'Functional Communication Training' },
  STANDARD: { label: 'Standart', color: '#a855f7', description: 'Standart Protokol' },
}

export default function ABCPage() {
  const router = useRouter()
  const [view, setView] = useState<'home' | 'profile' | 'session' | 'report'>('home')
  const [students, setStudents] = useState<ABCStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<ABCStudent | null>(null)
  const [currentSession, setCurrentSession] = useState<ABCSession | null>(null)
  const [events, setEvents] = useState<ABCEvent[]>([])
  const [items, setItems] = useState<ABCItem[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionStartTime] = useState(Date.now())

  // ABC form state
  const [abcStep, setAbcStep] = useState<ABCStep>('A')
  const [selectedA, setSelectedA] = useState<ABCItem | null>(null)
  const [selectedB, setSelectedB] = useState<ABCItem | null>(null)
  const [selectedC, setSelectedC] = useState<ABCItem | null>(null)
  const [isUnknownA, setIsUnknownA] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customText, setCustomText] = useState('')
  /** Öncül (A) Diğer ile eklendiğinde: metin girildikten sonra işlev seçimi için bekleyen etiket */
  const [customPendingLabel, setCustomPendingLabel] = useState<string | null>(null)
  const [customError, setCustomError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadStudents = async () => {
    setLoading(true)
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }
    const { data } = await sb.from('students_abc').select('*').order('created_at', { ascending: false })
    setStudents((data as ABCStudent[]) || [])
    setLoading(false)
  }

  const loadItems = async (studentId: string) => {
    const sb = getSupabase()
    if (!sb) return
    const { data } = await sb
      .from('abc_items')
      .select('*')
      .or(`student_id.is.null,student_id.eq.${studentId}`)
      .order('use_count', { ascending: false })
    setItems((data as ABCItem[]) || [])
  }

  const startSession = async (student: ABCStudent) => {
    const sb = getSupabase()
    if (!sb) return
    const { data } = await sb.from('abc_sessions').insert({
      student_id: student.id,
      student_name: student.name,
      intervention_route: student.intervention_route,
      event_count: 0,
    }).select().single()
    setCurrentSession(data as ABCSession)
    setSelectedStudent(student)
    setEvents([])
    await loadItems(student.id)
    setView('session')
  }

  useEffect(() => { loadStudents() }, [])

  // ABC Raporu ekranında aşağı kaydırmayı aç
  useEffect(() => {
    if (view === 'report') {
      document.body.classList.add('scrollable')
      return () => document.body.classList.remove('scrollable')
    }
  }, [view])

  const antecedents = items.filter(i => i.category === 'antecedent')
  const behaviors = items.filter(i => i.category === 'behavior')
  const consequences = items.filter(i => i.category === 'consequence')

  const handleSelectItem = (item: ABCItem) => {
    if (abcStep === 'A') { setSelectedA(item); setIsUnknownA(item.label.includes('Bilinmiyor')); setAbcStep('B') }
    else if (abcStep === 'B') { setSelectedB(item); setAbcStep('C') }
    else { setSelectedC(item); handleSaveEvent(item) }
  }

  const handleSaveEvent = async (cItem: ABCItem) => {
    if (!selectedA || !selectedB || !currentSession || !selectedStudent) return
    setSaving(true)
    const sb = getSupabase()
    const sessionMinute = Math.floor((Date.now() - sessionStartTime) / 60000)

    const eventData = {
      session_id: currentSession.id,
      student_id: selectedStudent.id,
      session_minute: sessionMinute,
      antecedent_id: isUnknownA ? null : selectedA.id,
      antecedent_label: selectedA.label,
      antecedent_unknown: isUnknownA,
      antecedent_function_hint: isUnknownA ? 'UNKNOWN' : (selectedA.function_hint ?? null),
      behavior_id: selectedB.id,
      behavior_label: selectedB.label,
      consequence_id: cItem.id,
      consequence_label: cItem.label,
      previous_event_id: events.length > 0 ? events[events.length - 1].id : null,
    }

    if (sb) {
      const { data } = await sb.from('abc_events').insert(eventData).select().single()
      if (data) {
        setEvents(prev => [...prev, data as ABCEvent])
        await sb.from('abc_sessions').update({ event_count: events.length + 1 }).eq('id', currentSession.id)
        // Kullanım sayısını artır
        await sb.from('abc_items').update({ use_count: selectedA.use_count + 1 }).eq('id', selectedA.id)
        await sb.from('abc_items').update({ use_count: selectedB.use_count + 1 }).eq('id', selectedB.id)
        await sb.from('abc_items').update({ use_count: cItem.use_count + 1 }).eq('id', cItem.id)
      }
    } else {
      setEvents(prev => [...prev, { ...eventData, id: crypto.randomUUID(), timestamp: new Date().toISOString(), behavior_duration_ms: null, notes: null } as ABCEvent])
    }

    // Reset form
    setSelectedA(null); setSelectedB(null); setSelectedC(null)
    setIsUnknownA(false); setAbcStep('A'); setSaving(false)
  }

  const handleAddCustom = async () => {
    if (!customText.trim() || !selectedStudent) return
    setCustomError(null)
    if (abcStep === 'A') {
      setCustomPendingLabel(customText.trim())
      return
    }
    await addCustomItem(customText.trim(), null)
  }

  const addCustomItem = async (label: string, functionHint: BehaviorFunction | null) => {
    if (!selectedStudent) return
    setCustomError(null)
    const sb = getSupabase()
    const category = abcStep === 'A' ? 'antecedent' : abcStep === 'B' ? 'behavior' : 'consequence'
    const newItem: Partial<ABCItem> = {
      student_id: selectedStudent.id,
      category,
      label,
      is_custom: true,
      use_count: 0,
      ...(category === 'antecedent' && functionHint != null ? { function_hint: functionHint } : {}),
    }
    if (sb) {
      const { data, error } = await sb.from('abc_items').insert(newItem).select().single()
      if (error) {
        setCustomError(error.message || 'Kayıt eklenemedi.')
        return
      }
      if (data) {
        setItems(prev => [...prev, data as ABCItem])
        handleSelectItem(data as ABCItem)
      }
    } else {
      const item = { ...newItem, id: crypto.randomUUID(), created_at: new Date().toISOString(), use_count: 0 } as ABCItem
      if (category === 'antecedent' && functionHint != null) (item as ABCItem).function_hint = functionHint
      setItems(prev => [...prev, item])
      handleSelectItem(item)
    }
    setCustomPendingLabel(null)
    setCustomText('')
    setShowCustomInput(false)
  }

  const handleAddCustomWithHint = (hint: BehaviorFunction) => {
    if (!customPendingLabel || !selectedStudent) return
    addCustomItem(customPendingLabel, hint)
  }

  const handleEndSession = async () => {
    if (!currentSession) return
    const sb = getSupabase()
    if (sb) await sb.from('abc_sessions').update({ ended_at: new Date().toISOString() }).eq('id', currentSession.id)
    setView('report')
  }

  if (view === 'home') return <ABCHome students={students} loading={loading} onSelect={startSession} onNewProfile={() => setView('profile')} />
  if (view === 'profile') return <ABCProfileForm onSave={async (student) => { await loadStudents(); setView('home') }} onBack={() => setView('home')} />
  if (view === 'report') return <ABCReport events={events} student={selectedStudent!} onClose={() => { setView('home'); setSelectedStudent(null); setCurrentSession(null) }} />

  const currentItems = abcStep === 'A' ? antecedents : abcStep === 'B' ? behaviors : consequences
  const routeConfig = selectedStudent ? ROUTE_CONFIG[selectedStudent.intervention_route] : null
  const filteredItems = abcStep === 'C' && selectedStudent?.intervention_route === 'SBT'
    ? currentItems.filter(i => !i.label.includes('Sönme'))
    : currentItems

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0a]" style={{ overflow: 'hidden', height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-black/40">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Modus" width={28} height={28} className="drop-shadow" />
          <div>
            <div className="text-white font-bold text-sm">{selectedStudent?.name}</div>
            {routeConfig && (
              <div className="text-xs font-medium" style={{ color: routeConfig.color }}>
                {routeConfig.label} · {routeConfig.description}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs">{events.length} kayıt</span>
          <button onClick={handleEndSession} className="btn-tactile text-xs font-medium text-red-400 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
            Bitir
          </button>
        </div>
      </div>

      {/* ABC Stepper */}
      <div className="flex px-4 py-2 gap-2">
        {(['A', 'B', 'C'] as ABCStep[]).map((s, i) => {
          const labels = { A: 'Öncül (A)', B: 'Davranış (B)', C: 'Müdahale (C)' }
          const colors = { A: '#f97316', B: '#ef4444', C: '#22c55e' }
          const done = (s === 'B' && selectedA) || (s === 'C' && selectedA && selectedB)
          const active = abcStep === s
          return (
            <div key={s} className="flex-1 rounded-xl px-3 py-2 text-center transition-all" style={{
              background: active ? `${colors[s]}20` : done ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? colors[s] + '60' : 'transparent'}`,
            }}>
              <div className="text-[10px] text-white/30">{labels[s]}</div>
              <div className="text-xs font-bold truncate mt-0.5" style={{ color: active ? colors[s] : done ? '#fff' : '#555' }}>
                {s === 'A' && selectedA ? selectedA.label : s === 'B' && selectedB ? selectedB.label : s === 'C' && selectedC ? selectedC.label : '—'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-2 gap-2">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleSelectItem(item)}
              disabled={saving}
              className="btn-tactile rounded-xl p-3 text-left flex items-center gap-2"
              style={{
                background: item.label.includes('Bilinmiyor') ? 'rgba(107,114,128,0.15)' : 'rgba(255,255,255,0.05)',
                border: item.label.includes('Bilinmiyor') ? '1px solid rgba(107,114,128,0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-xl">{item.icon || '•'}</span>
              <span className="text-white text-xs font-medium leading-tight">{item.label}</span>
              {item.use_count > 3 && <span className="ml-auto text-[10px] text-white/20">{item.use_count}</span>}
            </button>
          ))}

          {/* Diğer + */}
          <button
            onClick={() => setShowCustomInput(true)}
            className="btn-tactile rounded-xl p-3 text-left flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)' }}
          >
            <span className="text-xl">➕</span>
            <span className="text-white/40 text-xs">Diğer / Ekle</span>
          </button>
        </div>
      </div>

      {/* Custom input modal */}
      {showCustomInput && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-t-2xl p-5 w-full max-w-lg">
            {customPendingLabel == null ? (
              <>
                <h3 className="text-white font-bold mb-3">
                  {abcStep === 'A' ? 'Öncül' : abcStep === 'B' ? 'Davranış' : 'Müdahale'} Ekle
                </h3>
                <input
                  autoFocus
                  type="text"
                  value={customText}
                  onChange={e => { setCustomText(e.target.value); setCustomError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                  placeholder="Açıklama yaz..."
                  className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/25 outline-none mb-3"
                />
                {customError && <p className="text-red-400 text-xs mb-2">{customError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setShowCustomInput(false); setCustomText(''); setCustomPendingLabel(null); setCustomError(null) }} className="btn-tactile flex-1 py-3 rounded-xl border border-white/15 text-white/60 text-sm">İptal</button>
                  <button onClick={handleAddCustom} disabled={!customText.trim()} className="btn-tactile flex-1 py-3 rounded-xl font-bold text-sm text-black disabled:opacity-40" style={{ background: '#22c55e' }}>{abcStep === 'A' ? 'İleri' : 'Ekle ve Seç'}</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-white font-bold mb-1">Bu öncül hangi işleve uyuyor?</h3>
                <p className="text-white/50 text-sm mb-4">“{customPendingLabel}” — raporda pasta grafiğinde buna göre sayılacak.</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {(['ESCAPE', 'ATTENTION', 'SENSORY', 'UNKNOWN'] as BehaviorFunction[]).map(fn => (
                    <button
                      key={fn}
                      onClick={() => handleAddCustomWithHint(fn)}
                      className="btn-tactile py-3 rounded-xl text-sm font-bold text-left px-4"
                      style={{ background: `${FUNCTION_LABELS[fn].color}18`, border: `1px solid ${FUNCTION_LABELS[fn].color}50`, color: FUNCTION_LABELS[fn].color }}
                    >
                      {FUNCTION_LABELS[fn].label}
                    </button>
                  ))}
                </div>
                {customError && <p className="text-red-400 text-xs mb-2">{customError}</p>}
                <button onClick={() => { setCustomPendingLabel(null); setCustomError(null) }} className="btn-tactile w-full py-2.5 rounded-xl border border-white/15 text-white/50 text-sm">
                  ← Geri
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Son kayıtlar */}
      {events.length > 0 && (
        <div className="px-3 pb-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[...events].reverse().slice(0, 5).map((e, i) => (
              <div key={e.id} className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] text-white/40 flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <span>{e.antecedent_unknown ? '❓' : '•'}</span>
                <span className="truncate max-w-16">{e.behavior_label}</span>
                <span>→</span>
                <span className="truncate max-w-16">{e.consequence_label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ABC Home ──────────────────────────────────────────────────────────────────
function ABCHome({ students, loading, onSelect, onNewProfile }: {
  students: ABCStudent[]
  loading: boolean
  onSelect: (s: ABCStudent) => void
  onNewProfile: () => void
}) {
  const router = useRouter()
  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0a] px-5 pt-8">
      <button onClick={() => router.push('/')} className="text-white/30 text-sm mb-6 flex items-center gap-1 self-start">← Ana Sayfa</button>
      <div className="text-center mb-6">
        <Image src="/logo.png" alt="Modus" width={64} height={64} className="mx-auto mb-3" />
        <h2 className="text-white font-bold text-xl">ABC Tracker</h2>
        <p className="text-white/30 text-sm">Karar Destek · Davranış Analizi</p>
      </div>
      {loading ? <div className="text-white/30 text-sm text-center mt-8">Yükleniyor...</div> : (
        <div className="space-y-2 mb-4">
          {students.map(s => {
            const route = ROUTE_CONFIG[s.intervention_route]
            return (
              <button key={s.id} onClick={() => onSelect(s)} className="btn-tactile w-full flex items-center justify-between px-4 py-4 rounded-2xl text-left" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)' }}>
                <div>
                  <div className="text-white font-bold">{s.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${route.color}20`, color: route.color }}>{route.label}</span>
                    {s.risk_level === 'HIGH' && <span className="text-[10px] text-red-400">⚠️ Yüksek Risk</span>}
                  </div>
                </div>
                <span className="text-purple-400/40">›</span>
              </button>
            )
          })}
          {students.length === 0 && <p className="text-white/20 text-sm text-center py-4">Henüz profil yok</p>}
        </div>
      )}
      <button onClick={onNewProfile} className="btn-tactile w-full py-4 rounded-2xl font-bold text-sm text-white/70 border border-white/15">
        + Yeni Profil Oluştur
      </button>
    </div>
  )
}

// ─── Profile Form ─────────────────────────────────────────────────────────────
function ABCProfileForm({ onSave, onBack }: { onSave: (s: ABCStudent) => void; onBack: () => void }) {
  const [name, setName] = useState('')
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'HIGH'>('LOW')
  const [selfInjury, setSelfInjury] = useState(false)
  const [aggression, setAggression] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW')
  const [regulation, setRegulation] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [saving, setSaving] = useState(false)

  // Otomatik rota hesapla
  const route: InterventionRoute =
    riskLevel === 'HIGH' || selfInjury ? 'SBT' :
    regulation === 'HIGH' ? 'FCT' : 'STANDARD'

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const sb = getSupabase()
    const data = { name: name.trim(), risk_level: riskLevel, self_injury: selfInjury, aggression_level: aggression, regulation_level: regulation, intervention_route: route }
    if (sb) {
      const { data: saved } = await sb.from('students_abc').insert(data).select().single()
      if (saved) onSave(saved as ABCStudent)
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#0a0a0a] px-5 pt-8 overflow-y-auto">
      <button onClick={onBack} className="text-white/30 text-sm mb-6 flex items-center gap-1 self-start">← Geri</button>
      <Image src="/logo.png" alt="Modus" width={56} height={56} className="mx-auto mb-4" />
      <h2 className="text-white font-bold text-xl text-center mb-6">Pre-Session Profil</h2>

      <div className="space-y-5 max-w-sm mx-auto w-full">
        <div>
          <label className="text-white/50 text-xs uppercase tracking-wide mb-1.5 block">Öğrenci Adı</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="İsim" className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/25 outline-none focus:border-purple-500/60" />
        </div>

        <ToggleGroup label="Risk Seviyesi" value={riskLevel} onChange={v => setRiskLevel(v as 'LOW' | 'HIGH')}
          options={[{ value: 'LOW', label: 'Düşük Risk', color: '#22c55e' }, { value: 'HIGH', label: 'Yüksek Risk ⚠️', color: '#ef4444' }]} />

        <div>
          <label className="text-white/50 text-xs uppercase tracking-wide mb-1.5 flex items-center gap-2">
            Öz Zarar
            <button onClick={() => setSelfInjury(!selfInjury)} className={`w-10 h-5 rounded-full transition-colors relative ${selfInjury ? 'bg-red-500' : 'bg-white/20'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${selfInjury ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-white/30">{selfInjury ? 'Var' : 'Yok'}</span>
          </label>
        </div>

        <ToggleGroup label="Saldırganlık" value={aggression} onChange={v => setAggression(v as 'LOW' | 'MEDIUM' | 'HIGH')}
          options={[{ value: 'LOW', label: 'Düşük', color: '#22c55e' }, { value: 'MEDIUM', label: 'Orta', color: '#eab308' }, { value: 'HIGH', label: 'Yüksek', color: '#ef4444' }]} />

        <ToggleGroup label="Regülasyon" value={regulation} onChange={v => setRegulation(v as 'LOW' | 'MEDIUM' | 'HIGH')}
          options={[{ value: 'LOW', label: 'Düşük', color: '#ef4444' }, { value: 'MEDIUM', label: 'Orta', color: '#eab308' }, { value: 'HIGH', label: 'Yüksek', color: '#22c55e' }]} />

        {/* Otomatik rota */}
        <div className="rounded-xl p-4" style={{ background: `${ROUTE_CONFIG[route].color}15`, border: `1px solid ${ROUTE_CONFIG[route].color}40` }}>
          <div className="text-white/50 text-xs mb-1">Önerilen Müdahale Rotası</div>
          <div className="font-bold text-lg" style={{ color: ROUTE_CONFIG[route].color }}>{ROUTE_CONFIG[route].label}</div>
          <div className="text-white/50 text-xs mt-0.5">{ROUTE_CONFIG[route].description}</div>
          {route === 'SBT' && <div className="text-red-400 text-xs mt-1">⚠️ Sönme protokolü bu profilde devre dışı bırakılacak</div>}
        </div>

        <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-tactile w-full py-4 rounded-2xl font-black text-base text-black disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
          {saving ? 'Kaydediliyor...' : 'Profili Kaydet'}
        </button>
      </div>
    </div>
  )
}

function ToggleGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string; color: string }[] }) {
  return (
    <div>
      <label className="text-white/50 text-xs uppercase tracking-wide mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)} className="btn-tactile flex-1 py-2.5 rounded-xl text-xs font-bold transition-all" style={{
            background: value === o.value ? `${o.color}25` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${value === o.value ? o.color : 'rgba(255,255,255,0.1)'}`,
            color: value === o.value ? o.color : '#888',
          }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── ABC Report ───────────────────────────────────────────────────────────────
function ABCReport({ events, student, onClose }: { events: ABCEvent[]; student: ABCStudent; onClose: () => void }) {
  const hypothesis = computeFunctionalHypothesis(events)
  const interventions = computeInterventionAnalysis(events)
  const patterns = detectPatterns(events)
  const narrative = generateABCNarrative(student.name, hypothesis, interventions)

  const pieData = hypothesis.map(h => ({
    name: FUNCTION_LABELS[h.function]?.label || h.function,
    value: h.percentage,
    color: FUNCTION_LABELS[h.function]?.color || '#888',
  }))

  return (
    <div className="min-h-dvh bg-[#0a0a0a] overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl">ABC Raporu</h1>
            <p className="text-white/40 text-sm">{student.name} · {events.length} kayıt</p>
          </div>
          <button onClick={onClose} className="btn-tactile px-4 py-2 rounded-xl bg-white/8 text-white text-sm">✕ Kapat</button>
        </div>

        {/* Fonksiyonel Hipotez Pasta */}
        {pieData.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-white/60 text-sm font-semibold mb-3">Fonksiyonel Hipotez Analizi</h3>
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
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-white/60 text-xs">{d.name}</span>
                  <span className="font-bold text-xs" style={{ color: d.color }}>%{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Müdahale Verimliliği */}
        {interventions.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-white/60 text-sm font-semibold mb-3">Müdahale Verimliliği</h3>
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
          </div>
        )}

        {/* Pattern Insights */}
        {patterns.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <h3 className="text-blue-400 text-sm font-semibold mb-3">🔍 Örüntü Tespiti</h3>
            <div className="space-y-3">
              {patterns.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-blue-400/60 text-lg mt-0.5">
                    {p.type === 'TIME_PATTERN' ? '⏱' : p.type === 'ACTIVITY_PATTERN' ? '📚' : '🔁'}
                  </span>
                  <div>
                    <p className="text-white/70 text-sm leading-relaxed">{p.description}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <div className="h-1 rounded-full bg-blue-500/60" style={{ width: `${p.confidence}%`, maxWidth: 80 }} />
                      <span className="text-white/20 text-xs">%{p.confidence} güven</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Narrative */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="text-purple-400 font-bold text-sm mb-1">Sistem Değerlendirmesi</div>
              <p className="text-white/70 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: narrative.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
              />
            </div>
          </div>
        </div>

        {events.length === 0 && (
          <div className="text-center py-8 text-white/20 text-sm">Bu seansta hiç kayıt yapılmadı.</div>
        )}
      </div>
    </div>
  )
}
