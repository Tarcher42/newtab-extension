import type { KnownWord, Level, Word, WordState } from '../shared/types'

export type WordList = Record<Level, [word: string, meaning: string][]>

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1']

const key = (w: string) => w.trim().toLocaleLowerCase('en-US')

/** Accepts the pre-v3 shape (plain strings) so old data and old backups keep working. */
export function normalizeKnown(raw: unknown): KnownWord[] {
    if (!Array.isArray(raw)) return []
    const out: KnownWord[] = []
    const seen = new Set<string>()
    for (const entry of raw) {
        const word = typeof entry === 'string' ? entry : typeof entry?.word === 'string' ? entry.word : null
        if (!word || seen.has(key(word))) continue
        seen.add(key(word))
        out.push({ word, at: typeof entry?.at === 'number' ? entry.at : null })
    }
    return out
}

export function isKnown(known: KnownWord[], word: string): boolean {
    return known.some((k) => key(k.word) === key(word))
}

function levelWords(list: WordList, level: Level): Word[] {
    return (list[level] ?? []).map(([word, meaning]) => ({ word, meaning, level }))
}

/** Words of the chosen level plus every custom word, minus the ones marked known. */
export function pool(list: WordList, level: Level, custom: Word[], known: KnownWord[]): Word[] {
    const knownSet = new Set(known.map((k) => key(k.word)))
    const seen = new Set<string>()
    return [...levelWords(list, level), ...custom].filter((w) => {
        const k = key(w.word)
        if (knownSet.has(k) || seen.has(k)) return false
        seen.add(k)
        return true
    })
}

/** Every word the extension knows about, custom words first so they win on duplicates. */
export function allWords(list: WordList, custom: Word[]): Word[] {
    const seen = new Set<string>()
    return [...custom, ...LEVELS.flatMap((level) => levelWords(list, level))].filter((w) => {
        const k = key(w.word)
        if (seen.has(k)) return false
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

export function addKnown(state: WordState, word: string, now: number): WordState {
    if (isKnown(state.known, word)) return state
    return { ...state, known: [...state.known, { word, at: now }] }
}

export function removeKnown(state: WordState, word: string): WordState {
    if (!isKnown(state.known, word)) return state
    return { ...state, known: state.known.filter((k) => key(k.word) !== key(word)) }
}

/** Marks today's word known and moves to the word that took its place. */
export function markKnown(state: WordState, words: Word[], word: string, day: string, now: number): WordState {
    const withKnown = addKnown(state, word, now)
    const index = words.findIndex((w) => key(w.word) === key(word))
    const remaining = words.filter((w) => key(w.word) !== key(word))
    const next = remaining.length ? remaining[Math.max(0, index) % remaining.length] : null
    return { ...withKnown, today: next ? { date: day, word: next.word } : null }
}

export type KnownEntry = { word: string; meaning: string; level: Level | null; at: number | null }

/** Known words, newest first; entries without a date go last. */
export function knownEntries(state: WordState, list: WordList | null, custom: Word[]): KnownEntry[] {
    const meanings = new Map<string, Word>()
    if (list) for (const w of allWords(list, custom)) meanings.set(key(w.word), w)
    else for (const w of custom) meanings.set(key(w.word), w)

    return state.known
        .map(({ word, at }) => {
            const match = meanings.get(key(word))
            return { word, meaning: match?.meaning ?? '', level: match?.level ?? null, at }
        })
        .sort((a, b) => (b.at ?? -1) - (a.at ?? -1))
}

export type BrowseFilter = 'all' | 'known' | 'custom'
export type BrowseRow = KnownEntry & { known: boolean }

/** Rows for the settings word browser: filter first, then a case-insensitive search over word and meaning. */
export function browseWords(
    state: WordState,
    list: WordList | null,
    filter: BrowseFilter,
    query: string,
): BrowseRow[] {
    const knownMap = new Map(state.known.map((k) => [key(k.word), k.at]))
    const rows: BrowseRow[] =
        filter === 'known'
            ? knownEntries(state, list, state.custom).map((entry) => ({ ...entry, known: true }))
            : (filter === 'custom' ? state.custom : list ? allWords(list, state.custom) : state.custom).map((w) => ({
                  word: w.word,
                  meaning: w.meaning,
                  level: w.level,
                  at: knownMap.get(key(w.word)) ?? null,
                  known: knownMap.has(key(w.word)),
              }))

    const q = query.trim().toLocaleLowerCase('tr-TR')
    if (!q) return rows
    return rows.filter(
        (row) => row.word.toLocaleLowerCase('tr-TR').includes(q) || row.meaning.toLocaleLowerCase('tr-TR').includes(q),
    )
}
