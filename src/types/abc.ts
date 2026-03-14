// ─── ABC Tracker Types ────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'HIGH'
export type InterventionRoute = 'SBT' | 'FCT' | 'STANDARD'
export type BehaviorFunction = 'ESCAPE' | 'ATTENTION' | 'TANGIBLE' | 'SENSORY' | 'UNKNOWN'

export interface ABCStudent {
  id: string
  name: string
  risk_level: RiskLevel
  self_injury: boolean
  aggression_level: 'LOW' | 'MEDIUM' | 'HIGH'
  regulation_level: 'LOW' | 'MEDIUM' | 'HIGH'
  intervention_route: InterventionRoute
  created_at: string
}

export interface ABCItem {
  id: string
  student_id: string
  category: 'antecedent' | 'behavior' | 'consequence'
  label: string
  icon?: string
  is_custom: boolean
  use_count: number
  /** Sadece öncül (A) için: raporda Kaçma/İlgi/Duyusal/Belirsiz olarak kullanılır. Diğer ile eklenen öncüllerde kullanıcı seçer. */
  function_hint?: BehaviorFunction | null
  created_at: string
}

export interface ABCEvent {
  id: string
  session_id: string
  student_id: string
  timestamp: string
  session_minute: number
  antecedent_id: string | null
  antecedent_label: string
  antecedent_unknown: boolean
  /** Öncül öğesinde (function_hint) tanımlı işlev; rapor pasta grafiğinde buna göre sayılır. */
  antecedent_function_hint?: BehaviorFunction | null
  behavior_id: string | null
  behavior_label: string
  consequence_id: string | null
  consequence_label: string
  behavior_duration_ms: number | null
  previous_event_id: string | null
  notes: string | null
}

export interface ABCSession {
  id: string
  student_id: string
  student_name: string
  started_at: string
  ended_at: string | null
  event_count: number
  intervention_route: InterventionRoute
}

export interface InterventionAnalysis {
  consequence_label: string
  event_count: number
  avg_duration_ms: number
  effectiveness_score: number  // 0-100, düşük süre = yüksek etkinlik
  trend: 'EFFECTIVE' | 'RISKY' | 'NEUTRAL'
}

export interface FunctionalHypothesis {
  function: BehaviorFunction
  percentage: number
  count: number
}

export interface PatternInsight {
  type: 'TIME_PATTERN' | 'ACTIVITY_PATTERN' | 'SEQUENCE_PATTERN'
  description: string
  confidence: number  // 0-100
  data: Record<string, unknown>
}
