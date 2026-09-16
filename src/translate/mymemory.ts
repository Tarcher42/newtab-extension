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

export function parseMyMemory(json: unknown): string | null {
    const data = json as { responseStatus?: number | string; responseData?: { translatedText?: string }; quotaFinished?: boolean } | null
    if (!data || data.quotaFinished) return null
    if (Number(data.responseStatus) !== 200) return null
    const text = data.responseData?.translatedText?.trim()
    return text ? text : null
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
        const translated = parseMyMemory(await response.json())
        if (!translated) return { text: null, cache }
        return { text: translated, cache: trimCache({ ...cache, [k]: translated }) }
    } catch {
        return { text: null, cache }
    }
}
