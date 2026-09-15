import type { Level, Word, WordState } from '../shared/types'

export type WordList = Record<Level, [word: string, meaning: string][]>

const key = (w: string) => w.trim().toLocaleLowerCase('en-US')

/** Words of the chosen level plus every custom word, minus the ones marked known. */
export function pool(list: WordList, level: Level, custom: Word[], known: string[]): Word[] {
    const knownSet = new Set(known.map(key))
    const builtIn = (list[level] ?? []).map(([word, meaning]) => ({ word, meaning, level }))
    const seen = new Set<string>()
    return [...builtIn, ...custom].filter((w) => {
        const k = key(w.word)
        if (knownSet.has(k) || seen.has(k)) return false
        seen.add(k)
        return true
    })
}

function hash(text: string): number {
    let h = 2166136261
    for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
    return h
}

export function pickDaily(words: Word[], day: string): Word | null {
    return words.length ? words[hash(day) % words.length] : null
}

export function nextWord(words: Word[], current: string | null): Word | null {
    if (!words.length) return null
    const index = current === null ? -1 : words.findIndex((w) => key(w.word) === key(current))
    return words[(index + 1) % words.length]
}

/** Today's word: keeps the stored choice while it is still in the pool, otherwise picks by date. */
export function todayWord(state: WordState, words: Word[], day: string): { word: Word | null; state: WordState } {
    const stored = state.today?.date === day ? words.find((w) => key(w.word) === key(state.today!.word)) : undefined
    const word = stored ?? pickDaily(words, day)
    const today = word ? { date: day, word: word.word } : null
    const changed = today?.word !== state.today?.word || today?.date !== state.today?.date
    return { word, state: changed ? { ...state, today } : state }
}

export function advanceWord(state: WordState, words: Word[], day: string): WordState {
    const next = nextWord(words, state.today?.word ?? null)
    return { ...state, today: next ? { date: day, word: next.word } : null }
}

export function markKnown(state: WordState, words: Word[], word: string, day: string): WordState {
    const known = state.known.some((k) => key(k) === key(word)) ? state.known : [...state.known, word]
    const index = words.findIndex((w) => key(w.word) === key(word))
    const remaining = words.filter((w) => key(w.word) !== key(word))
    const next = remaining.length ? remaining[Math.max(0, index) % remaining.length] : null
    return { ...state, known, today: next ? { date: day, word: next.word } : null }
}
