import type { Word } from '../shared/types'
import { allWords, type WordList } from '../word/logic'

export type Lang = string
export type Direction = { from: Lang; to: Lang }

const EN_TO_TR: Direction = { from: 'en', to: 'tr' }
const TR_TO_EN: Direction = { from: 'tr', to: 'en' }

/** Codes accepted as a language prefix. Kept short so ordinary words are not mistaken for codes. */
export const LANGS = new Set(['tr', 'en', 'de', 'fr', 'es', 'it', 'ru', 'ar', 'az', 'fa', 'el', 'nl', 'pt', 'sv', 'ja', 'ko', 'zh', 'uk', 'pl'])

export type ParsedQuery = { text: string; from?: Lang; to?: Lang }

/**
 * `tr hello` translates automatically, `tr es merhaba` picks the target language and
 * `tr en-de hello` picks both. A code only counts when text follows it.
 */
export function parseQuery(query: string): ParsedQuery {
    const match = query.trim().match(/^([a-z]{2})(?:-([a-z]{2}))?\s+([\s\S]+)$/i)
    if (!match) return { text: query.trim() }

    const first = match[1].toLowerCase()
    const second = match[2]?.toLowerCase()
    const rest = match[3].trim()
    if (!LANGS.has(first) || (second && !LANGS.has(second))) return { text: query.trim() }
    return second ? { text: rest, from: first, to: second } : { text: rest, to: first }
}

const TURKISH_LETTERS = /[ğüşıöçİĞÜŞÖÇ]/
const key = (text: string) => text.trim().toLocaleLowerCase('tr-TR')

export type Index = { en: Map<string, string>; tr: Map<string, string> }

/** Two lookup tables built from the bundled lists: English → Turkish and back. */
export function buildIndex(list: WordList | null, custom: Word[]): Index {
    const index: Index = { en: new Map(), tr: new Map() }
    const words = list ? allWords(list, custom) : custom
    for (const { word, meaning } of words) {
        const en = key(word)
        if (!index.en.has(en)) index.en.set(en, meaning)
        // A meaning like "kuvvet, güç" holds two separate Turkish words.
        for (const part of meaning.split(/[,;]/)) {
            const tr = key(part)
            if (tr && !index.tr.has(tr)) index.tr.set(tr, word)
        }
    }
    return index
}

/**
 * Turkish letters settle it; otherwise a word the Turkish table knows means TR → EN.
 * Anything unclear falls back to EN → TR. Explicit codes from `parseQuery` win.
 */
export function detectDirection(text: string, index?: Index, parsed?: ParsedQuery): Direction {
    const trimmed = key(text)
    const auto =
        trimmed && (TURKISH_LETTERS.test(trimmed) || (index && !index.en.has(trimmed) && index.tr.has(trimmed))) ? TR_TO_EN : EN_TO_TR
    if (!parsed?.from && !parsed?.to) return auto

    // With only a target given, the source is whichever of Turkish or English the text is not.
    const to = parsed.to ?? (parsed.from === 'tr' ? 'en' : 'tr')
    const from = parsed.from ?? (to === auto.from ? auto.to : auto.from)
    return from === to ? auto : { from, to }
}

/** Exact match in the bundled lists. Phrases only hit when they are an entry ("ödünç almak"). */
export function localTranslate(text: string, direction: Direction, index: Index): string | null {
    const trimmed = key(text)
    if (!trimmed) return null
    return (direction.from === 'en' ? index.en.get(trimmed) : index.tr.get(trimmed)) ?? null
}

export function buildTranslateUrl(template: string, text: string, direction: Direction): string {
    return template
        .replaceAll('{from}', direction.from)
        .replaceAll('{to}', direction.to)
        .replaceAll('{q}', encodeURIComponent(text))
}

export const directionLabel = (d: Direction) => `${d.from.toUpperCase()}→${d.to.toUpperCase()}`
