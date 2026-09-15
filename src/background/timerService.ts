import { complete, reset, setTag, skip, start, pause, toggle, type Transition } from '../pomodoro/logic'
import type { TimerMessage } from '../pomodoro/messages'
import type { Phase, TimerState } from '../shared/types'
import type { StorageArea } from '../storage/area'
import { load, save, update } from '../storage/store'

export const ALARM = 'pomodoro'

export type TimerDeps = {
    area: StorageArea
    now: () => number
    setAlarm: (when: number) => void
    clearAlarm: () => void
    notify: (title: string, message: string) => void
    chime: () => void
}

const FINISHED: Record<Exclude<Phase, 'idle'>, string> = {
    work: 'Çalışma bitti',
    short: 'Kısa mola bitti',
    long: 'Uzun mola bitti',
}

const NEXT: Record<Phase, string> = {
    work: 'Çalışma zamanı',
    short: 'Kısa mola zamanı',
    long: 'Uzun mola zamanı',
    idle: '',
}

export function createTimerService(deps: TimerDeps) {
    async function commit(transition: Transition): Promise<TimerState> {
        const { state, session } = transition
        await save(deps.area, 'timer', state)
        if (session) await update(deps.area, 'sessions', (sessions) => [...sessions, session])
        if (state.endsAt !== null) deps.setAlarm(state.endsAt)
        else deps.clearAlarm()
        return state
    }

    async function handle(message: TimerMessage): Promise<TimerState> {
        const [timer, settings] = await Promise.all([load(deps.area, 'timer'), load(deps.area, 'settings')])
        const p = settings.pomodoro
        const now = deps.now()
        switch (message.action) {
            case 'toggle':
                return commit({ state: toggle(timer, p, now) })
            case 'start':
                return commit({ state: start(timer, p, now) })
            case 'pause':
                return commit({ state: pause(timer, now) })
            case 'reset':
                return commit(reset(timer, now))
            case 'skip':
                return commit(skip(timer, p, now))
            case 'tag':
                return commit({ state: setTag(timer, message.tag) })
        }
    }

    /** The alarm can fire late (sleep) or be stale (timer changed); only a due, running phase completes. */
    async function onAlarm(): Promise<void> {
        const [timer, settings] = await Promise.all([load(deps.area, 'timer'), load(deps.area, 'settings')])
        const now = deps.now()
        if (timer.endsAt === null) return
        if (timer.endsAt - now > 1000) {
            deps.setAlarm(timer.endsAt)
            return
        }
        const finished = timer.phase
        const state = await commit(complete(timer, settings.pomodoro, now))
        if (finished === 'idle') return
        const hint = state.endsAt === null ? 'Başlatmak için tıkla.' : 'Başladı.'
        deps.notify(FINISHED[finished], `${NEXT[state.phase]} · ${hint}`)
        if (settings.pomodoro.sound) deps.chime()
    }

    /** Sessions may have been interrupted while the browser was closed. */
    async function restore(): Promise<void> {
        const timer = await load(deps.area, 'timer')
        if (timer.endsAt === null) return
        if (timer.endsAt <= deps.now()) await onAlarm()
        else deps.setAlarm(timer.endsAt)
    }

    return { handle, onAlarm, restore }
}
