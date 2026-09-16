import type { Direction } from './logic'

export type FetchFn = (url: string) => Promise<Response>
export type TranslationCache = Record<string, string>

export const cacheKey = (text: string, d: Direction) => `${d.from}|${d.to}|${text.trim().toLocaleLowerCase('tr-TR')}`

/** Keeps the newest entries so a long session cannot grow the cache without bound. */
export function trimCache(cache: TranslationCache, max = 200): TranslationCache {
    const keys = Object.keys(cache)
    if (keys.length <= max) return cache
    return Object.fromEntries(keys.slice(keys.length - max).map((k) => [k, cache[k]]))
}

type Match = { translation?: string; match?: number | string; quality?: number | string }
type Payload = {
    responseStatus?: number | string
    responseData?: { translatedText?: string; match?: number | string }
    quotaFinished?: boolean
    matches?: Match[]
}

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

/**
 * MyMemory's memory holds community entries, and for short words the top one is often
 * junk ("hello" → "- Bu haftasonu ne yaptım."). Candidates are scored so a tidy answer
 * of roughly the right length wins over a high match score.
 */
export function scoreCandidate(candidate: string, source: string, match: number): number {
    const text = candidate.trim()
    if (!text) return -Infinity
    let score = match
    if (/^[-–—•*.,;:!?]/.test(text)) score -= 0.4
    // A translation should be about as long as the source, in words.
    score -= Math.abs(words(text) - words(source)) * 0.15
    if (words(text) > words(source) * 3 + 1) score -= 0.4
    if (/[?!]/.test(text) && !/[?!]/.test(source)) score -= 0.2
    if (text.length > source.length * 4 + 8) score -= 0.2
    return score
}

export function parseMyMemory(json: unknown, source = ''): string | null {
    const data = json as Payload | null
    if (!data || data.quotaFinished) return null
    if (Number(data.responseStatus) !== 200) return null

    const matches = (data.matches ?? []).map((m) => ({ text: (m.translation ?? '').trim(), match: Number(m.match ?? 0) })).filter((c) => c.text)
    const candidates = [{ text: (data.responseData?.translatedText ?? '').trim(), match: Number(data.responseData?.match ?? 0.5) }, ...matches].filter(
        (c) => c.text,
    )
    if (!candidates.length) return null

    // A real translation usually shows up more than once ("hola", "Hola"); junk appears alone.
    const repeats = new Map<string, number>()
    for (const { text } of matches) {
        const k = text.toLocaleLowerCase('tr-TR')
        repeats.set(k, (repeats.get(k) ?? 0) + 1)
    }
    const score = (c: { text: string; match: number }) =>
        scoreCandidate(c.text, source, c.match) + Math.min(0.3, ((repeats.get(c.text.toLocaleLowerCase('tr-TR')) ?? 1) - 1) * 0.15)

    return candidates.reduce((a, b) => (score(b) > score(a) ? b : a)).text
}

export type OnlineResult = { text: string | null; cache: TranslationCache }

/**
 * MyMemory is free and CORS-friendly but rate limited, so results are cached and
 * failures are never cached: the next attempt should be allowed to succeed.
 */
export async function translateOnline(
    text: string,
    direction: Direction,
    fetchFn: FetchFn,
    cache: TranslationCache,
): Promise<OnlineResult> {
    const trimmed = text.trim()
    if (!trimmed) return { text: null, cache }
    const k = cacheKey(trimmed, direction)
    if (k in cache) return { text: cache[k], cache }

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${direction.from}|${direction.to}`
    try {
        const response = await fetchFn(url)
        if (!response.ok) return { text: null, cache }
        const translated = parseMyMemory(await response.json(), trimmed)
        if (!translated) return { text: null, cache }
        return { text: translated, cache: trimCache({ ...cache, [k]: translated }) }
    } catch {
        return { text: null, cache }
    }
}
