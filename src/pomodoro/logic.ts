import { DEFAULT_TAG, DEFAULT_TIMER } from '../shared/defaults'
import type { Phase, Session, Settings, TimerState } from '../shared/types'

type PomodoroSettings = Settings['pomodoro']
export type Transition = { state: TimerState; session?: Session }

const MINUTE = 60_000
/** Interrupted work shorter than this is not worth recording. */
export const MIN_PARTIAL_MS = MINUTE

export function phaseMinutes(phase: Phase, settings: PomodoroSettings): number {
    switch (phase) {
        case 'short':
            return settings.shortMin
        case 'long':
            return settings.longMin
        default:
            return settings.workMin
    }
}

export const isRunning = (s: TimerState) => s.endsAt !== null
export const isPaused = (s: TimerState) => s.endsAt === null && s.pausedRemaining !== null
export const isIdle = (s: TimerState) => s.phase === 'idle'

export function remaining(state: TimerState, now: number): number {
    if (state.endsAt !== null) return Math.max(0, state.endsAt - now)
    return state.pausedRemaining ?? 0
}

function elapsed(state: TimerState, now: number): number {
    return state.durationMs === null ? 0 : state.durationMs - remaining(state, now)
}

function begin(state: TimerState, phase: Phase, settings: PomodoroSettings, now: number, run: boolean): TimerState {
    const durationMs = phaseMinutes(phase, settings) * MINUTE
    return {
        ...state,
        phase,
        durationMs,
        endsAt: run ? now + durationMs : null,
        pausedRemaining: run ? null : durationMs,
        startedAt: run ? now : null,
    }
}

export function start(state: TimerState, settings: PomodoroSettings, now: number): TimerState {
    if (isRunning(state)) return state
    if (isPaused(state)) return resume(state, now)
    return begin(state, 'work', settings, now, true)
}

export function pause(state: TimerState, now: number): TimerState {
    if (!isRunning(state)) return state
    return { ...state, endsAt: null, pausedRemaining: remaining(state, now) }
}

export function resume(state: TimerState, now: number): TimerState {
    if (!isPaused(state)) return state
    return { ...state, endsAt: now + state.pausedRemaining!, pausedRemaining: null, startedAt: state.startedAt ?? now }
}

export function toggle(state: TimerState, settings: PomodoroSettings, now: number): TimerState {
    return isRunning(state) ? pause(state, now) : start(state, settings, now)
}

function workSession(state: TimerState, ms: number, now: number): Session | undefined {
    if (state.phase !== 'work' || ms < MIN_PARTIAL_MS) return undefined
    return { start: state.startedAt ?? now - ms, minutes: Math.round(ms / MINUTE), tag: state.tag }
}

export function nextPhase(state: TimerState, settings: PomodoroSettings): { phase: Phase; round: number } {
    if (state.phase === 'work') {
        const long = state.round % settings.roundsUntilLong === 0
        return { phase: long ? 'long' : 'short', round: state.round }
    }
    return { phase: 'work', round: state.phase === 'idle' ? state.round : state.round + 1 }
}

function advance(state: TimerState, settings: PomodoroSettings, now: number): TimerState {
    const next = nextPhase(state, settings)
    return begin({ ...state, round: next.round }, next.phase, settings, now, settings.autoStart)
}

/** Called when the phase timer fires. Only a running phase can complete. */
export function complete(state: TimerState, settings: PomodoroSettings, now: number): Transition {
    if (!isRunning(state)) return { state }
    const session = workSession(state, state.durationMs ?? 0, now)
    return { state: advance(state, settings, now), session }
}

export function skip(state: TimerState, settings: PomodoroSettings, now: number): Transition {
    if (isIdle(state)) return { state }
    const session = workSession(state, elapsed(state, now), now)
    return { state: advance(state, settings, now), session }
}

export function reset(state: TimerState, now: number): Transition {
    const session = workSession(state, elapsed(state, now), now)
    return { state: { ...DEFAULT_TIMER, tag: state.tag }, session }
}

export function setTag(state: TimerState, tag: string): TimerState {
    return { ...state, tag: tag.trim() || DEFAULT_TAG }
}
