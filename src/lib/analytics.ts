import { SessionAnalytics, Session, CABLevel } from '@/types'

export function computeAnalytics(session: Session): SessionAnalytics {
  const t1 = session.timers.t1_session || 1
  const t2 = session.timers.t2_hre

  // HRE Score
  const hre_score = Math.round((t2 / t1) * 100)

  // State distribution (ms)
  const t5 = session.timers.t5_crisis
  const yellow_ms = t1 - t2 - t5
  const state_distribution = {
    GREEN: Math.round((t2 / t1) * 100),
    YELLOW: Math.round((Math.max(0, yellow_ms) / t1) * 100),
    RED: Math.round((t5 / t1) * 100),
  }

  // Peak CAB Level
  const maxLevel = session.trials.reduce((max, t) => Math.max(max, t.cab_level as number), 1)
  const peak_cab_level = maxLevel as unknown as CABLevel

  // Average recovery (T3)
  const completedRecoveries = session.recovery_events.filter(r => r.duration !== null)
  const avg_recovery_seconds =
    completedRecoveries.length > 0
      ? Math.round(
          completedRecoveries.reduce((sum, r) => sum + (r.duration || 0), 0) /
            completedRecoveries.length /
            1000
        )
      : 0

  // Tolerance Index: successful CAB3+4 trials / total session minutes
  const advancedSuccess = session.trials.filter(
    t => t.input === 'SUCCESS' && t.cab_level >= 3
  ).length
  const sessionMinutes = t1 / 60000 || 1
  const tolerance_index = Math.round((advancedSuccess / sessionMinutes) * 100) / 100

  // Compassion Latency: avg T4 latency for ASSENT_WITHDRAWAL events
  const withdrawals = session.trials.filter(
    t => t.input === 'ASSENT_WITHDRAWAL' && t.latency !== null
  )
  const compassion_latency =
    withdrawals.length > 0
      ? Math.round(
          withdrawals.reduce((sum, t) => sum + (t.latency || 0), 0) / withdrawals.length
        )
      : 0

  // Mastery Plot: minute -> cab_level for SUCCESS trials
  const sessionStart = new Date(session.started_at).getTime()
  const mastery_plot = session.trials
    .filter(t => t.input === 'SUCCESS')
    .map(t => ({
      minute: Math.floor((new Date(t.timestamp).getTime() - sessionStart) / 60000),
      cab_level: t.cab_level,
    }))
    .sort((a, b) => a.minute - b.minute)

  // Recovery heatmap: minute buckets for yellow events
  const recovery_heatmap: { minute: number; count: number }[] = []
  const heatmapMap = new Map<number, number>()
  session.recovery_events.forEach(r => {
    const minute = Math.floor((r.started_at - sessionStart) / 60000)
    heatmapMap.set(minute, (heatmapMap.get(minute) || 0) + 1)
  })
  heatmapMap.forEach((count, minute) => {
    recovery_heatmap.push({ minute, count })
  })
  recovery_heatmap.sort((a, b) => a.minute - b.minute)

  return {
    hre_score,
    peak_cab_level,
    avg_recovery_seconds,
    tolerance_index,
    compassion_latency,
    mastery_plot,
    recovery_heatmap,
    state_distribution,
  }
}

export function generateNarrative(
  studentName: string,
  analytics: SessionAnalytics
): string {
  const { hre_score, peak_cab_level, avg_recovery_seconds, recovery_heatmap } = analytics
  const yellowCount = analytics.mastery_plot.length > 0 ? recovery_heatmap.reduce((s, h) => s + h.count, 0) : 0
  const mood = hre_score >= 80 ? 'oldukça yüksekti' : hre_score >= 60 ? 'iyiydi' : 'gelişme gösterdi'

  return `${studentName} bugün CAB ${peak_cab_level} seviyesindeki görevlerde ${
    yellowCount > 0 ? `başlangıçta zorlansa da (${yellowCount} Sarı Işık), ` : ''
  }kendisine sağlanan güvenli alan sayesinde kriz yaşamadan %${hre_score} başarı oranıyla tamamladı. Ortalama toparlanma süresi ${avg_recovery_seconds} saniyeydi. Motivasyonu seans sonunda ${mood}.`
}
