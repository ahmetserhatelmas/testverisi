import { getSupabase } from './supabase'
import { Session } from '@/types'

export async function syncSessionToSupabase(session: Session): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) {
    console.info('[Modus] Supabase not configured, skipping sync.')
    return
  }
  try {
    const { error: sessionError } = await supabase.from('sessions').upsert({
      session_id: session.session_id,
      student_id: session.student_id,
      student_name: session.student_name,
      started_at: session.started_at,
      ended_at: session.ended_at,
      initial_cab_level: session.initial_cab_level,
      final_cab_level: session.final_cab_level,
      t1_session: session.timers.t1_session,
      t2_hre: session.timers.t2_hre,
      t3_recovery: session.timers.t3_recovery,
      t4_latency: session.timers.t4_latency,
      t5_crisis: session.timers.t5_crisis,
    })
    if (sessionError) throw sessionError

    if (session.trials.length > 0) {
      const { error: trialsError } = await supabase.from('trials').upsert(
        session.trials.map(t => ({
          trial_id: t.trial_id,
          session_id: t.session_id,
          student_id: session.student_id,
          timestamp: t.timestamp,
          state_at_start: t.state_at_start,
          cab_level: t.cab_level,
          input: t.input,
          latency_ms: t.latency,
          result_state: t.result_state,
        }))
      )
      if (trialsError) throw trialsError
    }

    if (session.recovery_events.length > 0) {
      const { error: recoveryError } = await supabase.from('recovery_events').upsert(
        session.recovery_events.map((r, i) => ({
          id: `${session.session_id}-recovery-${i}`,
          session_id: session.session_id,
          student_id: session.student_id,
          started_at: r.started_at,
          ended_at: r.ended_at,
          duration_ms: r.duration,
        }))
      )
      if (recoveryError) throw recoveryError
    }

    if (session.final_cab_level) {
      await supabase
        .from('students')
        .update({ last_successful_level: session.final_cab_level })
        .eq('id', session.student_id)
    }
  } catch (err) {
    console.warn('[Modus] Supabase sync failed, data saved locally:', err)
  }
}
