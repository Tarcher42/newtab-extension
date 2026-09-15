/**
 * Dev-only stand-in for the WebExtension APIs so `vite` can serve the page in a normal
 * browser tab. Storage goes to localStorage and the Pomodoro timer runs in the page.
 * Never included in production builds (see main.tsx).
 */
import { createTimerService } from '../background/timerService'
import { browserArea } from '../storage/area'

type Listener = (changes: Record<string, { newValue?: unknown }>, area: string) => void

const PREFIX = 'newtab-dev:'
const listeners = new Set<Listener>()

const local = {
    async get(key: string) {
        const raw = localStorage.getItem(PREFIX + key)
        return { [key]: raw === null ? undefined : JSON.parse(raw) }
    },
    async set(items: Record<string, unknown>) {
        const changes: Record<string, { newValue?: unknown }> = {}
        for (const [key, value] of Object.entries(items)) {
            localStorage.setItem(PREFIX + key, JSON.stringify(value))
            changes[key] = { newValue: value }
        }
        listeners.forEach((l) => l(changes, 'local'))
    },
    async remove(key: string) {
        localStorage.removeItem(PREFIX + key)
        listeners.forEach((l) => l({ [key]: {} }, 'local'))
    },
}

let alarm: ReturnType<typeof setTimeout> | undefined

const timer = createTimerService({
    area: browserArea,
    now: () => Date.now(),
    setAlarm: (when) => {
        clearTimeout(alarm)
        alarm = setTimeout(() => void timer.onAlarm(), Math.max(0, when - Date.now()))
    },
    clearAlarm: () => clearTimeout(alarm),
    notify: (title, message) => console.info(`[notification] ${title} — ${message}`),
    chime: () => undefined,
})

;(globalThis as unknown as { browser: unknown }).browser = {
    storage: {
        local,
        onChanged: {
            addListener: (l: Listener) => listeners.add(l),
            removeListener: (l: Listener) => listeners.delete(l),
        },
    },
    runtime: {
        sendMessage: (message: Parameters<typeof timer.handle>[0]) => timer.handle(message),
        getURL: (path: string) => path,
    },
    tabs: {
        create: ({ url }: { url: string }) => window.open(url, '_blank'),
    },
}

void timer.restore()
