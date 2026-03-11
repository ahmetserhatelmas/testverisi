'use client'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts'
import { SessionAnalytics, Session } from '@/types'
import { computeAnalytics, generateNarrative } from '@/lib/analytics'
import { formatTime } from '@/lib/useTimers'

interface Props {
  session: Session
  onClose: () => void
}

const STATE_COLORS = {
  GREEN: '#22c55e',
  YELLOW: '#eab308',
  RED: '#ef4444',
}

export function AnalyticsDashboard({ session, onClose }: Props) {
  const analytics = computeAnalytics(session)
  const narrative = generateNarrative(session.student_name, analytics)

  const pieData = [
    { name: 'HRE (Yeşil)', value: analytics.state_distribution.GREEN, color: STATE_COLORS.GREEN },
    { name: 'Toparlanma (Sarı)', value: analytics.state_distribution.YELLOW, color: STATE_COLORS.YELLOW },
    { name: 'Kriz (Kırmızı)', value: analytics.state_distribution.RED, color: STATE_COLORS.RED },
  ].filter(d => d.value > 0)

  const masteryData = analytics.mastery_plot.map(p => ({
    ...p,
    cab_label: `CAB ${p.cab_level}`,
  }))

  const recoveryData = analytics.recovery_heatmap

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-2xl">Seans Raporu</h1>
            <p className="text-white/50 text-sm">{session.student_name} · {new Date(session.started_at).toLocaleDateString('tr-TR')}</p>
          </div>
          <button
            onClick={onClose}
            className="btn-tactile px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium"
          >
            ✕ Kapat
          </button>
        </div>

        {/* Snapshot Cards */}
        <div className="grid grid-cols-3 gap-3">
          <SnapshotCard
            label="HRE Skoru"
            value={`%${analytics.hre_score}`}
            sub="Yeşil Mod"
            color="#22c55e"
          />
          <SnapshotCard
            label="Zirve CAB"
            value={`CAB ${analytics.peak_cab_level}`}
            sub="En yüksek seviye"
            color="#3b82f6"
          />
          <SnapshotCard
            label="Onarım Hızı"
            value={`${analytics.avg_recovery_seconds}sn`}
            sub="Ort. toparlanma"
            color="#f97316"
          />
        </div>

        {/* Seans Süresi */}
        <div className="grid grid-cols-2 gap-3">
          <MetricRow label="Toplam Seans" value={formatTime(session.timers.t1_session)} />
          <MetricRow label="HRE Süresi" value={formatTime(session.timers.t2_hre)} />
          <MetricRow label="Tolerans Endeksi" value={analytics.tolerance_index.toFixed(2)} />
          <MetricRow
            label="Şefkat Hızı"
            value={analytics.compassion_latency > 0 ? `${(analytics.compassion_latency / 1000).toFixed(1)}sn` : '—'}
          />
        </div>

        {/* Pie Chart */}
        <ChartCard title="HRE Dağılımı (Seans Kalitesi)">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: %${value}`}
                labelLine={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `%${value}`}
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-white/50 text-xs">{d.name}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Mastery Plot */}
        {masteryData.length > 0 && (
          <ChartCard title="Tolerans & Başarı Çizelgesi">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={masteryData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="minute"
                  tick={{ fill: '#888', fontSize: 10 }}
                  tickFormatter={v => `${v}dk`}
                />
                <YAxis
                  domain={[0.5, 4.5]}
                  ticks={[1, 2, 3, 4]}
                  tick={{ fill: '#888', fontSize: 10 }}
                  tickFormatter={v => `CAB ${v}`}
                />
                <Tooltip
                  formatter={(v) => `CAB ${v}`}
                  labelFormatter={l => `${l}. dakika`}
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                  itemStyle={{ color: '#22c55e' }}
                />
                <Line
                  type="monotone"
                  dataKey="cab_level"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-white/30 text-xs mt-2 text-center">
              Çizgi yukarı tırmanıyorsa şefkatli yaklaşım akademik başarıyı getiriyor ✓
            </p>
          </ChartCard>
        )}

        {/* Recovery Heatmap */}
        {recoveryData.length > 0 && (
          <ChartCard title="Fısıltı Isı Haritası (Sarı Yoğunluğu)">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={recoveryData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="minute" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={v => `${v}dk`} />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [`${v} kez`, 'Sarı Işık']}
                  labelFormatter={l => `${l}. dakika`}
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                  itemStyle={{ color: '#eab308' }}
                />
                <Bar dataKey="count" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* AI Narrative */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">📝</span>
            <div>
              <div className="text-green-400 font-bold text-sm mb-1">Veli Notu</div>
              <p className="text-white/70 text-sm leading-relaxed">{narrative}</p>
            </div>
          </div>
        </div>

        {/* Trials summary */}
        <div className="text-center pb-4">
          <span className="text-white/30 text-xs">
            Toplam {session.trials.length} deneme · {session.recovery_events.length} toparlanma olayı
          </span>
        </div>
      </div>
    </div>
  )
}

function SnapshotCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30` }}>
      <div className="font-bold text-xl" style={{ color }}>{value}</div>
      <div className="text-white font-medium text-xs mt-0.5">{label}</div>
      <div className="text-white/30 text-[10px]">{sub}</div>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/4">
      <span className="text-white/50 text-sm">{label}</span>
      <span className="text-white font-bold text-sm">{value}</span>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h3 className="text-white/70 text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  )
}
