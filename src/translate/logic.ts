import type { Word } from '../shared/types'
import { allWords, type WordList } from '../word/logic'

export type Lang = 'en' | 'tr'
export type Direction = { from: Lang; to: Lang }

const EN_TO_TR: Direction = { from: 'en', to: 'tr' }
const TR_TO_EN: Direction = { from: 'tr', to: 'en' }

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

/** Turkish letters settle it; otherwise a word the Turkish table knows means TR → EN. */
export function detectDirection(text: string, index?: Index): Direction {
    const trimmed = key(text)
    if (!trimmed) return EN_TO_TR
    if (TURKISH_LETTERS.test(trimmed)) return TR_TO_EN
    if (index && !index.en.has(trimmed) && index.tr.has(trimmed)) return TR_TO_EN
    return EN_TO_TR
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
