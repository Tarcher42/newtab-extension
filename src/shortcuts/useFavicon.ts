import { useEffect, useState } from 'preact/hooks'
import type { FaviconCache, Shortcut } from '../shared/types'
import type { StorageArea } from '../storage/area'
import { load, save } from '../storage/store'
import { useStorageArea } from '../storage/useStored'
import { resolveFavicon } from './favicon'
import { domainOf } from './logic'

type Shared = { cache: Promise<FaviconCache>; pending: Map<string, Promise<string | null>> }

/** One cache per storage area, so tiles resolving at the same time do not overwrite each other's results. */
const sharedByArea = new WeakMap<StorageArea, Shared>()

function shared(area: StorageArea): Shared {
    let entry = sharedByArea.get(area)
    if (!entry) {
        entry = { cache: load(area, 'favicons'), pending: new Map() }
        sharedByArea.set(area, entry)
    }
    return entry
}

const fetchIcon = (url: string) => fetch(url, { credentials: 'omit' })

function resolveShared(area: StorageArea, domain: string): Promise<string | null> {
    const entry = shared(area)
    const existing = entry.pending.get(domain)
    if (existing) return existing

    const promise = entry.cache.then(async (cache) => {
        const result = await resolveFavicon(domain, fetchIcon, cache, Date.now())
        if (result.cache !== cache) {
            entry.cache = Promise.resolve(result.cache)
            await save(area, 'favicons', result.cache)
        }
        return result.data
    })
    entry.pending.set(domain, promise)
    void promise.finally(() => entry.pending.delete(domain))
    return promise
}

/** Image source for a tile, or null when the letter fallback should be shown. */
export function useFavicon(shortcut: Shortcut): string | null {
    const area = useStorageArea()
    const { type, value } = shortcut.icon
    const [auto, setAuto] = useState<string | null>(null)
    const domain = domainOf(shortcut.url)

    useEffect(() => {
        setAuto(null)
        if (type !== 'auto' || !domain) return
        let active = true
        resolveShared(area, domain)
            .then((data) => active && setAuto(data))
            .catch(() => undefined)
        return () => {
            active = false
        }
    }, [area, type, domain])

    if (type === 'url' || type === 'upload') return value || null
    if (type === 'letter') return null
    return auto
}
