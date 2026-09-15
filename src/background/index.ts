import { isTimerMessage } from '../pomodoro/messages'
import { browserArea } from '../storage/area'
import { playChime } from './chime'
import { ALARM, createTimerService } from './timerService'

const NOTIFICATION = 'pomodoro'

const timer = createTimerService({
    area: browserArea,
    now: () => Date.now(),
    setAlarm: (when) => browser.alarms.create(ALARM, { when }),
    clearAlarm: () => void browser.alarms.clear(ALARM),
    notify: (title, message) =>
        void browser.notifications.create(NOTIFICATION, {
            type: 'basic',
            iconUrl: browser.runtime.getURL('icons/icon-96.png'),
            title,
            message,
        }),
    chime: playChime,
})

browser.runtime.onMessage.addListener((message: unknown) => {
    if (isTimerMessage(message)) return timer.handle(message)
    return undefined
})

browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM) void timer.onAlarm()
})

browser.notifications.onClicked.addListener((id) => {
    if (id !== NOTIFICATION) return
    void browser.notifications.clear(id)
    void timer.handle({ type: 'timer', action: 'start' })
})

browser.runtime.onStartup.addListener(() => void timer.restore())
browser.runtime.onInstalled.addListener(() => void timer.restore())
