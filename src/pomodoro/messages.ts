export type TimerAction = 'toggle' | 'start' | 'pause' | 'reset' | 'skip'

export type TimerMessage = { type: 'timer'; action: TimerAction } | { type: 'timer'; action: 'tag'; tag: string }

export function isTimerMessage(value: unknown): value is TimerMessage {
    return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'timer'
}

export function sendTimer(message: TimerMessage): Promise<unknown> {
    return browser.runtime.sendMessage(message)
}
