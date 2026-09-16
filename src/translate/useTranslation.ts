import { useEffect, useMemo, useState } from 'preact/hooks'
import { update } from '../storage/store'
import { useStorageArea, useStored } from '../storage/useStored'
import { loadWordList } from '../word/list'
import type { WordList } from '../word/logic'
import { buildIndex, detectDirection, localTranslate, parseQuery, type Direction } from './logic'
import { cacheKey, translateOnline } from './mymemory'

/** Waiting this long after the last keystroke keeps one request per phrase, not per letter. */
const DEBOUNCE_MS = 350

export type TranslationState = {
    text: string | null
    /** The text to translate, with any language codes stripped. */
    input: string
    direction: Direction
    source: 'local' | 'online' | null
    loading: boolean
    failed: boolean
}

export function useTranslation(query: string, online: boolean): TranslationState {
    const area = useStorageArea()
    const [word] = useStored('word')
    const [cache] = useStored('translations')
    const [list, setList] = useState<WordList | null>(null)
    const [remote, setRemote] = useState<{ query: string; text: string | null } | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadWordList()
            .then(setList)
            .catch(() => setList(null))
    }, [])

    const index = useMemo(() => buildIndex(list, word.custom), [list, word.custom])
    const parsed = useMemo(() => parseQuery(query), [query])
    const text = parsed.text
    const direction = useMemo(() => detectDirection(text, index, parsed), [text, index, parsed])
    // The bundled lists only hold English and Turkish.
    const localPair = (direction.from === 'en' && direction.to === 'tr') || (direction.from === 'tr' && direction.to === 'en')
    const local = useMemo(() => (text && localPair ? localTranslate(text, direction, index) : null), [text, direction, index, localPair])
    const cached = text ? cache[cacheKey(text, direction)] : undefined

    useEffect(() => {
        setRemote(null)
        setLoading(false)
        // The bundled lists are cleaner than the online memory for single words, so a local
        // hit ends it; phrases and unknown words go to the service.
        if (!text || local || cached !== undefined || !online) return

        let active = true
        setLoading(true)
        const timer = setTimeout(async () => {
            const result = await translateOnline(text, direction, (url) => fetch(url, { credentials: 'omit' }), cache)
            if (!active) return
            setRemote({ query: text, text: result.text })
            setLoading(false)
            if (result.cache !== cache) await update(area, 'translations', () => result.cache)
        }, DEBOUNCE_MS)

        return () => {
            active = false
            clearTimeout(timer)
        }
    }, [text, direction.from, direction.to, local, cached, online])

    const base = { input: text, direction }
    if (!text) return { ...base, text: null, source: null, loading: false, failed: false }
    if (cached !== undefined) return { ...base, text: cached, source: 'online', loading: false, failed: false }
    if (remote?.query === text && remote.text) return { ...base, text: remote.text, source: 'online', loading: false, failed: false }
    // A local hit is shown right away, even while the online lookup is still running.
    if (local) return { ...base, text: local, source: 'local', loading, failed: false }
    if (loading) return { ...base, text: null, source: null, loading: true, failed: false }
    if (remote?.query === text) return { ...base, text: null, source: null, loading: false, failed: true }
    return { ...base, text: null, source: null, loading: false, failed: !online }
}
