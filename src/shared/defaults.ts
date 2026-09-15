import type { Command, Groups, Settings, TimerState, WordState } from './types'

export const SCHEMA_VERSION = 1
export const DEFAULT_TAG = 'Genel'

export const DEFAULT_SETTINGS: Settings = {
    schemaVersion: SCHEMA_VERSION,
    clock: { h24: true, seconds: false },
    background: { type: 'default', color: '#1e2433' },
    fonts: { ui: 'JetBrains Mono Variable', clock: 'Outfit Variable' },
    shadowStrength: 0.6,
    widgetOrder: ['word', 'pomodoro', 'stats'],
    widgetsEnabled: { word: true, pomodoro: true, stats: true },
    pomodoro: { workMin: 25, shortMin: 5, longMin: 15, roundsUntilLong: 4, sound: true, autoStart: false },
    wordLevel: 'B1',
}

export const DEFAULT_GROUPS: Groups = { left: [], right: [] }

export const DEFAULT_COMMANDS: Command[] = [
    { id: 'act-pomo', trigger: 'pomo', kind: 'action', actionId: 'pomodoro.toggle', uses: 0 },
    { id: 'act-stop', trigger: 'stop', kind: 'action', actionId: 'pomodoro.reset', uses: 0 },
    { id: 'act-skip', trigger: 'skip', kind: 'action', actionId: 'pomodoro.skip', uses: 0 },
    { id: 'act-tag', trigger: 'tag', kind: 'action', actionId: 'pomodoro.tag', uses: 0 },
    { id: 'act-word', trigger: 'word', kind: 'action', actionId: 'word.next', uses: 0 },
    { id: 'act-settings', trigger: 'settings', kind: 'action', actionId: 'settings.open', uses: 0 },
    { id: 'link-gh', trigger: 'gh', kind: 'link', url: 'https://github.com', uses: 0 },
    { id: 'link-3000', trigger: '3000', kind: 'link', url: 'http://localhost:3000', uses: 0 },
    { id: 'search-g', trigger: 'g', kind: 'search', template: 'https://www.google.com/search?q={q}', uses: 0 },
    { id: 'search-yt', trigger: 'yt', kind: 'search', template: 'https://www.youtube.com/results?search_query={q}', uses: 0 },
]

export const DEFAULT_TIMER: TimerState = { phase: 'idle', endsAt: null, pausedRemaining: null, round: 1, tag: DEFAULT_TAG }

export const DEFAULT_WORD_STATE: WordState = { known: [], custom: [], today: null, cache: {} }
