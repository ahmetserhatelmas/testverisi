import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { AppState, CABLevel, Trial, Session, RecoveryEvent, Student } from '@/types'

interface TimerState {
  t1_start: number | null
  t2_start: number | null
  t2_accumulated: number
  t3_start: number | null
  t4_start: number | null
  t5_start: number | null
  t5_accumulated: number
}

interface SessionState {
  // Session info
  session: Session | null
  student: Student | null
  appState: AppState
  cabLevel: CABLevel
  consecutiveSuccesses: number
  sdActive: boolean           // SD button pressed, T4 running
  isSessionActive: boolean

  // Timers (raw timestamps)
  timers: TimerState

  // Pending level-up confirmation
  levelUpPending: boolean

  // UI helpers
  softMode: boolean

  // Actions
  startSession: (student: Student, initialLevel: CABLevel) => void
  endSession: () => Session | null
  pressGreen: () => void
  pressYellow: () => void
  pressRed: () => void
  resolveRed: () => void
  pressSD: () => void
  pressSuccess: () => void
  pressFail: () => void
  pressFCT: () => void
  confirmLevelUp: () => void
  rejectLevelUp: () => void
  toggleSoftMode: () => void

  // Computed getters (called with Date.now())
  getElapsedTimers: (now: number) => {
    t1: number; t2: number; t3: number; t4: number; t5: number
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  student: null,
  appState: 'GREEN',
  cabLevel: 1,
  consecutiveSuccesses: 0,
  sdActive: false,
  isSessionActive: false,
  timers: {
    t1_start: null,
    t2_start: null,
    t2_accumulated: 0,
    t3_start: null,
    t4_start: null,
    t5_start: null,
    t5_accumulated: 0,
  },
  levelUpPending: false,
  softMode: false,

  startSession: (student, initialLevel) => {
    const now = Date.now()
    const session: Session = {
      session_id: uuidv4(),
      student_id: student.id,
      student_name: student.name,
      started_at: new Date(now).toISOString(),
      ended_at: null,
      initial_cab_level: initialLevel,
      final_cab_level: null,
      trials: [],
      recovery_events: [],
      timers: { t1_session: 0, t2_hre: 0, t3_recovery: 0, t4_latency: 0, t5_crisis: 0 },
    }
    set({
      session,
      student,
      appState: 'GREEN',
      cabLevel: initialLevel,
      consecutiveSuccesses: 0,
      sdActive: false,
      isSessionActive: true,
      levelUpPending: false,
      timers: {
        t1_start: now,
        t2_start: now, // GREEN starts immediately
        t2_accumulated: 0,
        t3_start: null,
        t4_start: null,
        t5_start: null,
        t5_accumulated: 0,
      },
    })
  },

  endSession: () => {
    const { session, timers, appState, cabLevel } = get()
    if (!session) return null
    const now = Date.now()
    const elapsed = get().getElapsedTimers(now)
    const finalSession: Session = {
      ...session,
      ended_at: new Date(now).toISOString(),
      final_cab_level: cabLevel,
      timers: {
        t1_session: elapsed.t1,
        t2_hre: elapsed.t2,
        t3_recovery: elapsed.t3,
        t4_latency: elapsed.t4,
        t5_crisis: elapsed.t5,
      },
    }
    set({ isSessionActive: false, session: finalSession })
    return finalSession
  },

  pressGreen: () => {
    const { appState, timers, session } = get()
    // Sarı moddan HRE'ye direkt geçiş yasak — FCT kullanılmalı
    if (appState === 'GREEN' || appState === 'YELLOW' || !session) return
    const now = Date.now()

    // Accumulate T3 if coming from YELLOW
    if (appState === 'YELLOW' && timers.t3_start) {
      const t3Duration = now - timers.t3_start
      // update last recovery event
      const updatedRecoveries = [...session.recovery_events]
      if (updatedRecoveries.length > 0) {
        const last = updatedRecoveries[updatedRecoveries.length - 1]
        if (last.ended_at === null) {
          updatedRecoveries[updatedRecoveries.length - 1] = {
            ...last,
            ended_at: now,
            duration: t3Duration,
          }
        }
      }
      set(s => ({
        appState: 'GREEN',
        sdActive: false,
        timers: { ...s.timers, t2_start: now, t3_start: null, t4_start: null },
        session: { ...session, recovery_events: updatedRecoveries },
      }))
    } else {
      set(s => ({
        appState: 'GREEN',
        sdActive: false,
        timers: { ...s.timers, t2_start: now, t3_start: null, t4_start: null },
      }))
    }
  },

  pressYellow: () => {
    const { appState, timers, cabLevel, session } = get()
    if (appState === 'YELLOW' || appState === 'RED' || !session) return
    const now = Date.now()

    // Pause T2
    const t2Acc = timers.t2_accumulated + (timers.t2_start ? now - timers.t2_start : 0)
    const newLevel = Math.max(1, cabLevel - 1) as CABLevel

    // Start T3, add recovery event
    const recoveryEvent: RecoveryEvent = { started_at: now, ended_at: null, duration: null }

    set(s => ({
      appState: 'YELLOW',
      cabLevel: newLevel,
      consecutiveSuccesses: 0,
      sdActive: false,
      timers: {
        ...s.timers,
        t2_start: null,
        t2_accumulated: t2Acc,
        t3_start: now,
        t4_start: null,
      },
      session: s.session
        ? { ...s.session, recovery_events: [...s.session.recovery_events, recoveryEvent] }
        : s.session,
    }))
  },

  pressRed: () => {
    const { appState, timers, session } = get()
    if (appState === 'RED' || !session) return
    const now = Date.now()

    // Pause T2 if GREEN
    const t2Acc = timers.t2_accumulated + (timers.t2_start ? now - timers.t2_start : 0)

    set(s => ({
      appState: 'RED',
      sdActive: false,
      timers: {
        ...s.timers,
        t2_start: null,
        t2_accumulated: t2Acc,
        t3_start: null,
        t4_start: null,
        t5_start: now,
      },
    }))
  },

  resolveRed: () => {
    const { timers } = get()
    const now = Date.now()
    const t5Acc = timers.t5_accumulated + (timers.t5_start ? now - timers.t5_start : 0)

    set(s => ({
      appState: 'GREEN',
      sdActive: false,
      timers: {
        ...s.timers,
        t2_start: now,
        t5_start: null,
        t5_accumulated: t5Acc,
        t4_start: null,
      },
    }))
  },

  pressSD: () => {
    const { appState } = get()
    if (appState !== 'GREEN') return
    const now = Date.now()
    set(s => ({ sdActive: true, timers: { ...s.timers, t4_start: now } }))
  },

  pressSuccess: () => {
    const { appState, sdActive, timers, cabLevel, consecutiveSuccesses, session } = get()
    if (appState !== 'GREEN' || !session) return
    const now = Date.now()

    const latency = timers.t4_start ? now - timers.t4_start : null
    const trial: Trial = {
      trial_id: uuidv4(),
      session_id: session.session_id,
      timestamp: new Date(now).toISOString(),
      state_at_start: 'GREEN',
      cab_level: cabLevel,
      input: 'SUCCESS',
      latency,
      result_state: 'GREEN',
    }

    const newConsecutive = consecutiveSuccesses + 1
    const levelUpPending = newConsecutive >= 3 && cabLevel < 4

    set(s => ({
      sdActive: false,
      consecutiveSuccesses: levelUpPending ? newConsecutive : newConsecutive,
      levelUpPending,
      timers: { ...s.timers, t4_start: null },
      session: s.session ? { ...s.session, trials: [...s.session.trials, trial] } : s.session,
    }))
  },

  pressFail: () => {
    const { appState, timers, cabLevel, session } = get()
    if (appState !== 'GREEN' || !session) return
    const now = Date.now()

    const latency = timers.t4_start ? now - timers.t4_start : null
    const trial: Trial = {
      trial_id: uuidv4(),
      session_id: session.session_id,
      timestamp: new Date(now).toISOString(),
      state_at_start: 'GREEN',
      cab_level: cabLevel,
      input: 'FAIL',
      latency,
      result_state: 'GREEN',
    }

    set(s => ({
      sdActive: false,
      consecutiveSuccesses: 0,
      timers: { ...s.timers, t4_start: null },
      session: s.session ? { ...s.session, trials: [...s.session.trials, trial] } : s.session,
    }))
  },

  pressFCT: () => {
    const { appState, timers, cabLevel, session } = get()
    if (appState !== 'YELLOW' || !session) return
    const now = Date.now()

    const t3Duration = timers.t3_start ? now - timers.t3_start : 0
    const newLevel = Math.max(1, cabLevel - 1) as CABLevel

    const updatedRecoveries = [...session.recovery_events]
    if (updatedRecoveries.length > 0) {
      const last = updatedRecoveries[updatedRecoveries.length - 1]
      if (last.ended_at === null) {
        updatedRecoveries[updatedRecoveries.length - 1] = {
          ...last,
          ended_at: now,
          duration: t3Duration,
        }
      }
    }

    const trial: Trial = {
      trial_id: uuidv4(),
      session_id: session.session_id,
      timestamp: new Date(now).toISOString(),
      state_at_start: 'YELLOW',
      cab_level: cabLevel,
      input: 'ASSENT_WITHDRAWAL',
      latency: t3Duration,
      result_state: 'GREEN',
    }

    set(s => ({
      appState: 'GREEN',
      cabLevel: newLevel,
      consecutiveSuccesses: 0,
      sdActive: false,
      timers: {
        ...s.timers,
        t2_start: now,
        t3_start: null,
        t4_start: null,
      },
      session: s.session
        ? {
            ...s.session,
            recovery_events: updatedRecoveries,
            trials: [...s.session.trials, trial],
          }
        : s.session,
    }))
  },

  confirmLevelUp: () => {
    const { cabLevel } = get()
    const newLevel = Math.min(4, cabLevel + 1) as CABLevel
    set({ cabLevel: newLevel, consecutiveSuccesses: 0, levelUpPending: false })
  },

  rejectLevelUp: () => {
    set({ consecutiveSuccesses: 0, levelUpPending: false })
  },

  toggleSoftMode: () => {
    set(s => ({ softMode: !s.softMode }))
  },

  getElapsedTimers: (now: number) => {
    const { timers, appState } = get()
    const t1 = timers.t1_start ? now - timers.t1_start : 0
    const t2 = timers.t2_accumulated + (timers.t2_start ? now - timers.t2_start : 0)
    const t3 = timers.t3_start ? now - timers.t3_start : 0
    const t4 = timers.t4_start ? now - timers.t4_start : 0
    const t5 = timers.t5_accumulated + (timers.t5_start ? now - timers.t5_start : 0)
    return { t1, t2, t3, t4, t5 }
  },
}))
