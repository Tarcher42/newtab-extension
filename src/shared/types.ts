export type WidgetId = 'word' | 'pomodoro' | 'stats'
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
export type Side = 'left' | 'right'

export type Settings = {
    schemaVersion: number
    clock: { h24: boolean; seconds: boolean }
    background: { type: 'default' | 'upload' | 'color'; color: string }
    fonts: { ui: string; clock: string }
    shadowStrength: number
    widgetOrder: WidgetId[]
    widgetsEnabled: Record<WidgetId, boolean>
    pomodoro: {
        workMin: number
        shortMin: number
        longMin: number
        roundsUntilLong: number
        sound: boolean
        autoStart: boolean
    }
    wordLevel: Level
}

export type ShortcutIcon = { type: 'auto' | 'url' | 'upload' | 'letter'; value?: string }

export type Shortcut = {
    id: string
    title: string
    url: string
    icon: ShortcutIcon
}

export type Groups = { left: Shortcut[]; right: Shortcut[] }

export type ActionId = 'pomodoro.toggle' | 'pomodoro.reset' | 'pomodoro.skip' | 'pomodoro.tag' | 'word.next' | 'settings.open'

export type Command = {
    id: string
    trigger: string
    kind: 'link' | 'search' | 'action'
    url?: string
    template?: string
    actionId?: ActionId
    uses: number
}

export type Phase = 'idle' | 'work' | 'short' | 'long'

export type TimerState = {
    phase: Phase
    endsAt: number | null
    pausedRemaining: number | null
    round: number
    tag: string
}

export type Session = { start: number; minutes: number; tag: string }

export type Word = { word: string; meaning: string; level: Level }

export type DictionaryData = {
    phonetic?: string
    audio?: string
    definition?: string
    example?: string
}

export type WordState = {
    known: string[]
    custom: Word[]
    today: { date: string; word: string } | null
    cache: Record<string, DictionaryData>
}

export type FaviconCache = Record<string, { data: string | null; at: number }>
