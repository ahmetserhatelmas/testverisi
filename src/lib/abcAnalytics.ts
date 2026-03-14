import { ABCEvent, FunctionalHypothesis, InterventionAnalysis, PatternInsight, BehaviorFunction } from '@/types/abc'

// Davranışın fonksiyonunu belirle (antecedent'e göre)
const ESCAPE_ANTECEDENTS = ['Zor Görev', 'Geçiş', 'Bekleme', 'Nesne Alındı']
const ATTENTION_ANTECEDENTS = ['Sosyal İlgi Kesilmesi', 'Yeni Kişi']
const SENSORY_ANTECEDENTS = ['Ortam Gürültüsü']

function inferFunction(antecedentLabel: string, unknown: boolean): BehaviorFunction {
  if (unknown) return 'UNKNOWN'
  if (ESCAPE_ANTECEDENTS.some(a => antecedentLabel.includes(a))) return 'ESCAPE'
  if (ATTENTION_ANTECEDENTS.some(a => antecedentLabel.includes(a))) return 'ATTENTION'
  if (SENSORY_ANTECEDENTS.some(a => antecedentLabel.includes(a))) return 'SENSORY'
  return 'UNKNOWN'
}

export function computeFunctionalHypothesis(events: ABCEvent[]): FunctionalHypothesis[] {
  const counts: Record<BehaviorFunction, number> = {
    ESCAPE: 0, ATTENTION: 0, TANGIBLE: 0, SENSORY: 0, UNKNOWN: 0,
  }
  const validFunctions: BehaviorFunction[] = ['ESCAPE', 'ATTENTION', 'TANGIBLE', 'SENSORY', 'UNKNOWN']
  events.forEach(e => {
    const hint = e.antecedent_function_hint
    const fn =
      hint != null && validFunctions.includes(hint as BehaviorFunction)
        ? (hint as BehaviorFunction)
        : inferFunction(e.antecedent_label, e.antecedent_unknown)
    counts[fn]++
  })
  const total = events.length || 1
  return (Object.entries(counts) as [BehaviorFunction, number][])
    .filter(([, count]) => count > 0)
    .map(([fn, count]) => ({
      function: fn,
      percentage: Math.round((count / total) * 100),
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

export function computeInterventionAnalysis(events: ABCEvent[]): InterventionAnalysis[] {
  const map = new Map<string, { count: number; total_duration: number }>()
  events.forEach(e => {
    const key = e.consequence_label
    const existing = map.get(key) || { count: 0, total_duration: 0 }
    map.set(key, {
      count: existing.count + 1,
      total_duration: existing.total_duration + (e.behavior_duration_ms || 0),
    })
  })

  const results: InterventionAnalysis[] = []
  // Ortalama süreyi baz alarak etkililik skoru hesapla
  const allDurations = events.map(e => e.behavior_duration_ms || 0).filter(d => d > 0)
  const globalAvg = allDurations.length > 0
    ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length
    : 0

  map.forEach((val, label) => {
    const avg = val.count > 0 ? val.total_duration / val.count : 0
    let effectiveness_score = 50
    let trend: InterventionAnalysis['trend'] = 'NEUTRAL'

    if (globalAvg > 0 && val.count >= 2) {
      const ratio = avg / globalAvg
      if (ratio < 0.7) { effectiveness_score = Math.round((1 - ratio) * 100); trend = 'EFFECTIVE' }
      else if (ratio > 1.3) { effectiveness_score = Math.round(ratio * 30); trend = 'RISKY' }
    }

    results.push({ consequence_label: label, event_count: val.count, avg_duration_ms: avg, effectiveness_score, trend })
  })

  return results.sort((a, b) => b.event_count - a.event_count)
}

export function detectPatterns(events: ABCEvent[]): PatternInsight[] {
  const insights: PatternInsight[] = []
  if (events.length < 5) return insights

  // 1. Zaman örüntüsü: krizler hangi dakikada yoğunlaşıyor?
  const minuteCounts = new Map<number, number>()
  events.forEach(e => {
    const bucket = Math.floor(e.session_minute / 5) * 5 // 5dk bucket
    minuteCounts.set(bucket, (minuteCounts.get(bucket) || 0) + 1)
  })
  const maxBucket = [...minuteCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (maxBucket && maxBucket[1] >= 2) {
    insights.push({
      type: 'TIME_PATTERN',
      description: `Krizlerin ${maxBucket[1]}/${events.length}'i seansın ${maxBucket[0]}-${maxBucket[0] + 5}. dakikalarında yoğunlaşıyor.`,
      confidence: Math.min(95, Math.round((maxBucket[1] / events.length) * 100) + 20),
      data: { peak_minute: maxBucket[0], count: maxBucket[1] },
    })
  }

  // 2. Etkinlik örüntüsü: en sık tekrarlanan antecedent
  const antecedentCounts = new Map<string, number>()
  events.filter(e => !e.antecedent_unknown).forEach(e => {
    antecedentCounts.set(e.antecedent_label, (antecedentCounts.get(e.antecedent_label) || 0) + 1)
  })
  const topAntecedent = [...antecedentCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (topAntecedent && topAntecedent[1] >= 2) {
    const pct = Math.round((topAntecedent[1] / events.length) * 100)
    insights.push({
      type: 'ACTIVITY_PATTERN',
      description: `Krizlerin %${pct}'i "${topAntecedent[0]}" öncülüyle başlıyor. Bu etkinlikte talep azaltılması veya yöntem değişikliği önerilebilir.`,
      confidence: Math.min(90, pct + 15),
      data: { antecedent: topAntecedent[0], count: topAntecedent[1] },
    })
  }

  // 3. Bilinmeyen öncül analizi
  const unknownEvents = events.filter(e => e.antecedent_unknown)
  if (unknownEvents.length >= 3) {
    // En yaygın dakika
    const unknownMinutes = unknownEvents.map(e => e.session_minute)
    const avgMinute = Math.round(unknownMinutes.reduce((a, b) => a + b, 0) / unknownMinutes.length)
    insights.push({
      type: 'SEQUENCE_PATTERN',
      description: `"Bilinmiyor" öncüllü ${unknownEvents.length} kriz var. Ortalama ${avgMinute}. dakikada gerçekleşiyor. Olası neden: yorgunluk veya ortam faktörü.`,
      confidence: 60,
      data: { count: unknownEvents.length, avg_minute: avgMinute },
    })
  }

  return insights
}

export function generateABCNarrative(
  studentName: string,
  hypothesis: FunctionalHypothesis[],
  interventions: InterventionAnalysis[],
): string {
  const topFunction = hypothesis[0]
  const riskyIntervention = interventions.find(i => i.trend === 'RISKY')
  const effectiveIntervention = interventions.find(i => i.trend === 'EFFECTIVE')

  const FUNCTION_LABELS: Record<string, string> = {
    ESCAPE: 'kaçma/kaçınma',
    ATTENTION: 'sosyal ilgi arama',
    TANGIBLE: 'nesne/aktivite erişimi',
    SENSORY: 'duyusal düzenleme',
    UNKNOWN: 'belirsiz',
  }

  let text = `${studentName}'in davranışları ağırlıklı olarak **${FUNCTION_LABELS[topFunction?.function] || 'belirsiz'}** işlevine hizmet ediyor (%${topFunction?.percentage || 0}).`

  if (effectiveIntervention) {
    text += ` "${effectiveIntervention.consequence_label}" müdahalesi bu vakada en etkili yöntem olarak öne çıkıyor (kriz süresi ortalama ${Math.round(effectiveIntervention.avg_duration_ms / 1000)}sn).`
  }

  if (riskyIntervention) {
    text += ` ⚠️ "${riskyIntervention.consequence_label}" uygulandığında kriz süresi uzuyor — bu vakada bu yöntemi azaltmayı değerlendirin.`
  }

  return text
}
