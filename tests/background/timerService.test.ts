import { createTimerService } from '../../src/background/timerService'
import { load } from '../../src/storage/store'
import { memoryArea } from '../fakes/memoryArea'

const MIN = 60_000

function setup(settings: Record<string, unknown> = {}) {
    let now = 0
    const area = memoryArea({ settings })
    const deps = {
        area,
        now: () => now,
        setAlarm: vi.fn(),
        clearAlarm: vi.fn(),
        notify: vi.fn(),
        chime: vi.fn(),
    }
    const service = createTimerService(deps)
    return { area, deps, service, advance: (ms: number) => (now += ms) }
}

test('start schedules an alarm at the end of the work phase', async () => {
    const { service, deps, area } = setup()
    const state = await service.handle({ type: 'timer', action: 'start' })
    expect(state.endsAt).toBe(25 * MIN)
    expect(deps.setAlarm).toHaveBeenCalledWith(25 * MIN)
    expect((await load(area, 'timer')).phase).toBe('work')
})

test('pausing clears the alarm', async () => {
    const { service, deps, advance } = setup()
    await service.handle({ type: 'timer', action: 'start' })
    advance(MIN)
    await service.handle({ type: 'timer', action: 'toggle' })
    expect(deps.clearAlarm).toHaveBeenCalled()
})

test('alarm completes work, stores the session, notifies and chimes', async () => {
    const { service, deps, area, advance } = setup()
    await service.handle({ type: 'timer', action: 'tag', tag: 'React' })
    await service.handle({ type: 'timer', action: 'start' })
    advance(25 * MIN)
    await service.onAlarm()
    expect(await load(area, 'sessions')).toEqual([{ start: 0, minutes: 25, tag: 'React' }])
    expect((await load(area, 'timer')).phase).toBe('short')
    expect(deps.notify).toHaveBeenCalledWith('Çalışma bitti', 'Kısa mola zamanı · Başlatmak için tıkla.')
    expect(deps.chime).toHaveBeenCalled()
})

test('sound can be turned off', async () => {
    const { service, deps, advance } = setup({ pomodoro: { sound: false } })
    await service.handle({ type: 'timer', action: 'start' })
    advance(25 * MIN)
    await service.onAlarm()
    expect(deps.notify).toHaveBeenCalled()
    expect(deps.chime).not.toHaveBeenCalled()
})

test('an early alarm is rescheduled instead of completing', async () => {
    const { service, deps, area, advance } = setup()
    await service.handle({ type: 'timer', action: 'start' })
    advance(10 * MIN)
    await service.onAlarm()
    expect((await load(area, 'timer')).phase).toBe('work')
    expect(deps.setAlarm).toHaveBeenLastCalledWith(25 * MIN)
    expect(deps.notify).not.toHaveBeenCalled()
})

test('restore completes a phase that ended while the browser was closed', async () => {
    const { service, area, advance } = setup()
    await service.handle({ type: 'timer', action: 'start' })
    advance(40 * MIN)
    await service.restore()
    expect(await load(area, 'sessions')).toHaveLength(1)
})
