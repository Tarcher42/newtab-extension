export type WidgetId = 'word' | 'pomodoro' | 'stats'
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
export type Side = 'left' | 'right'

export type Settings = {
    schemaVersion: number
    clock: { h24: boolean; seconds: boolean }
    /** `imageVersion` changes on every upload so open tabs reload the stored image. */
    background: { type: 'default' | 'upload' | 'color'; color: string; imageVersion: number }
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
    /** When off, the palette translates only with the bundled word lists. */
    translateOnline: boolean
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
    kind: 'link' | 'search' | 'action' | 'translate'
    url?: string
    template?: string
    actionId?: ActionId
    uses: number
}

export type Phase = 'idle' | 'work' | 'short' | 'long'

export type TimerState = {
    phase: Phase
    /** Set while running. */
    endsAt: number | null
    /** Set while paused, or when a phase is waiting to be started. */
    pausedRemaining: number | null
    /** Length of the current phase, fixed when the phase begins. */
    durationMs: number | null
    /** First time the current phase was started. */
    startedAt: number | null
    /** Work rounds count from 1; a long break follows every `roundsUntilLong`-th round. */
    round: number
    tag: string
}

export type Session = { start: number; minutes: number; tag: string }

export type Word = { word: string; meaning: string; level: Level }

export type DictionaryData = {
    partOfSpeech?: string
    definition?: string
    example?: string
}

/** `at` is null for words marked known before dates were recorded. */
export type KnownWord = { word: string; at: number | null }

export type WordState = {
    known: KnownWord[]
    custom: Word[]
    today: { date: string; word: string } | null
    cache: Record<string, DictionaryData>
}

export type FaviconCache = Record<string, { data: string | null; at: number }>
