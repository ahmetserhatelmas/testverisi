export type AppState = 'GREEN' | 'YELLOW' | 'RED'
export type CABLevel = 1 | 2 | 3 | 4
export type TrialInput = 'SUCCESS' | 'FAIL' | 'ASSENT_WITHDRAWAL'
export type ResultState = 'GREEN' | 'YELLOW'

export interface Trial {
  trial_id: string
  session_id: string
  timestamp: string
  state_at_start: AppState
  cab_level: CABLevel
  input: TrialInput
  latency: number | null
  result_state: ResultState
}

export interface TimerSnapshot {
  t1_session: number       // total session duration (ms)
  t2_hre: number           // HRE (green) time (ms)
  t3_recovery: number      // current/last recovery time (ms)
  t4_latency: number       // SD to response latency (ms)
  t5_crisis: number        // crisis (red) duration (ms)
}

export interface RecoveryEvent {
  started_at: number       // epoch ms
  ended_at: number | null
  duration: number | null
}

export interface Session {
  session_id: string
  student_id: string
  student_name: string
  started_at: string
  ended_at: string | null
  initial_cab_level: CABLevel
  final_cab_level: CABLevel | null
  trials: Trial[]
  recovery_events: RecoveryEvent[]
  timers: TimerSnapshot
}

export interface Student {
  id: string
  name: string
  last_successful_level: CABLevel
  created_at: string
}

export interface SessionAnalytics {
  hre_score: number            // percentage 0-100
  peak_cab_level: CABLevel
  avg_recovery_seconds: number
  tolerance_index: number
  compassion_latency: number   // ms
  mastery_plot: { second: number; cab_level: CABLevel }[]
  recovery_heatmap: { minute: number; count: number }[]
  state_distribution: { GREEN: number; YELLOW: number; RED: number }
}
