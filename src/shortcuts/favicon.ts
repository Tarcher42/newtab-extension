import type { FaviconCache } from '../shared/types'

export const FAVICON_TTL = 7 * 24 * 60 * 60 * 1000

export type FetchFn = (url: string) => Promise<Response>

export function faviconSources(domain: string): string[] {
    const d = encodeURIComponent(domain)
    return [`https://icons.duckduckgo.com/ip3/${d}.ico`, `https://www.google.com/s2/favicons?domain=${d}&sz=64`]
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return `data:${blob.type};base64,${btoa(binary)}`
}

export type FaviconResult = { data: string | null; cache: FaviconCache }

/**
 * Both services answer a missing icon with 404 plus a placeholder image, so the
 * status code is the only reliable signal. A network failure is not cached, so
 * an offline start does not stick sites with letter icons for a week.
 */
export async function resolveFavicon(domain: string, fetchFn: FetchFn, cache: FaviconCache, now: number): Promise<FaviconResult> {
    const hit = cache[domain]
    if (hit && now - hit.at < FAVICON_TTL) return { data: hit.data, cache }

    let networkFailed = false
    for (const source of faviconSources(domain)) {
        try {
            const response = await fetchFn(source)
            if (!response.ok) continue
            const blob = await response.blob()
            if (!blob.type.startsWith('image/') || blob.size === 0) continue
            const data = await blobToDataUrl(blob)
            return { data, cache: { ...cache, [domain]: { data, at: now } } }
        } catch {
            networkFailed = true
        }
    }
    if (networkFailed) return { data: null, cache }
    return { data: null, cache: { ...cache, [domain]: { data: null, at: now } } }
}
