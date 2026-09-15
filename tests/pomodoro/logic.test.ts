import {
    complete,
    isPaused,
    isRunning,
    pause,
    remaining,
    reset,
    resume,
    setTag,
    skip,
    start,
    toggle,
} from '../../src/pomodoro/logic'
import { DEFAULT_SETTINGS, DEFAULT_TIMER } from '../../src/shared/defaults'
import type { TimerState } from '../../src/shared/types'

const MIN = 60_000
const settings = DEFAULT_SETTINGS.pomodoro
const auto = { ...settings, autoStart: true }

describe('start / pause / resume', () => {
    test('start from idle runs a work phase', () => {
        const s = start(DEFAULT_TIMER, settings, 0)
        expect(s.phase).toBe('work')
        expect(s.endsAt).toBe(25 * MIN)
        expect(s.startedAt).toBe(0)
        expect(isRunning(s)).toBe(true)
    })

    test('pause keeps the remaining time and resume continues from it', () => {
        let s = start(DEFAULT_TIMER, settings, 0)
        s = pause(s, 10 * MIN)
        expect(isPaused(s)).toBe(true)
        expect(remaining(s, 99 * MIN)).toBe(15 * MIN)
        s = resume(s, 50 * MIN)
        expect(s.endsAt).toBe(65 * MIN)
        expect(s.startedAt).toBe(0)
    })

    test('toggle alternates', () => {
        let s = toggle(DEFAULT_TIMER, settings, 0)
        expect(isRunning(s)).toBe(true)
        s = toggle(s, settings, MIN)
        expect(isPaused(s)).toBe(true)
        s = toggle(s, settings, 2 * MIN)
        expect(isRunning(s)).toBe(true)
    })

    test('remaining never goes negative', () => {
        expect(remaining(start(DEFAULT_TIMER, settings, 0), 30 * MIN)).toBe(0)
    })
})

describe('complete', () => {
    test('work completes into a waiting short break and records a full session', () => {
        const running = setTag(start(DEFAULT_TIMER, settings, 0), 'React')
        const { state, session } = complete(running, settings, 25 * MIN)
        expect(session).toEqual({ start: 0, minutes: 25, tag: 'React' })
        expect(state.phase).toBe('short')
        expect(state.endsAt).toBeNull()
        expect(state.pausedRemaining).toBe(5 * MIN)
        expect(state.tag).toBe('React')
    })

    test('breaks are never recorded and lead to the next round', () => {
        let s = start(DEFAULT_TIMER, auto, 0)
        s = complete(s, auto, 25 * MIN).state
        const { state, session } = complete(s, auto, 30 * MIN)
        expect(session).toBeUndefined()
        expect(state.phase).toBe('work')
        expect(state.round).toBe(2)
    })

    test('the 4th work round is followed by a long break', () => {
        let s: TimerState = start(DEFAULT_TIMER, auto, 0)
        const phases: string[] = []
        let now = 0
        for (let i = 0; i < 8; i++) {
            now = s.endsAt!
            s = complete(s, auto, now).state
            phases.push(s.phase)
        }
        expect(phases).toEqual(['short', 'work', 'short', 'work', 'short', 'work', 'long', 'work'])
        expect(s.round).toBe(5)
    })

    test('autoStart runs the next phase immediately', () => {
        const { state } = complete(start(DEFAULT_TIMER, auto, 0), auto, 25 * MIN)
        expect(state.endsAt).toBe(30 * MIN)
    })

    test('a paused timer cannot complete', () => {
        const paused = pause(start(DEFAULT_TIMER, settings, 0), MIN)
        expect(complete(paused, settings, 25 * MIN).state).toBe(paused)
    })
})

describe('reset', () => {
    test('under a minute of work records nothing', () => {
        const { state, session } = reset(start(DEFAULT_TIMER, settings, 0), 30_000)
        expect(session).toBeUndefined()
        expect(state.phase).toBe('idle')
    })

    test('five minutes of work records five minutes', () => {
        const { session } = reset(start(DEFAULT_TIMER, settings, 0), 5 * MIN)
        expect(session?.minutes).toBe(5)
    })

    test('keeps the tag', () => {
        const { state } = reset(setTag(start(DEFAULT_TIMER, settings, 0), 'Matematik'), MIN)
        expect(state.tag).toBe('Matematik')
        expect(state.round).toBe(1)
    })

    test('paused work counts only the time actually run', () => {
        let s = start(DEFAULT_TIMER, settings, 0)
        s = pause(s, 3 * MIN)
        expect(reset(s, 60 * MIN).session?.minutes).toBe(3)
    })
})

describe('skip', () => {
    test('skipping work records the partial session and moves to a break', () => {
        const { state, session } = skip(start(DEFAULT_TIMER, settings, 0), settings, 12 * MIN)
        expect(session?.minutes).toBe(12)
        expect(state.phase).toBe('short')
    })

    test('skipping a break records nothing', () => {
        const brk = complete(start(DEFAULT_TIMER, settings, 0), settings, 25 * MIN).state
        const { state, session } = skip(brk, settings, 26 * MIN)
        expect(session).toBeUndefined()
        expect(state.phase).toBe('work')
    })

    test('skip does nothing when idle', () => {
        expect(skip(DEFAULT_TIMER, settings, 0).state).toBe(DEFAULT_TIMER)
    })
})

test('empty tag falls back to Genel', () => {
    expect(setTag(DEFAULT_TIMER, '   ').tag).toBe('Genel')
})
