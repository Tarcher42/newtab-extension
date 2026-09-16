import { useEffect, useMemo, useState } from 'preact/hooks'
import { update } from '../storage/store'
import { useStorageArea, useStored } from '../storage/useStored'
import { loadWordList } from '../word/list'
import type { WordList } from '../word/logic'
import { buildIndex, detectDirection, localTranslate, type Direction } from './logic'
import { cacheKey, translateOnline } from './mymemory'

/** Waiting this long after the last keystroke keeps one request per phrase, not per letter. */
const DEBOUNCE_MS = 350

export type TranslationState = {
    text: string | null
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
    const text = query.trim()
    const direction = useMemo(() => detectDirection(text, index), [text, index])
    const local = useMemo(() => (text ? localTranslate(text, direction, index) : null), [text, direction, index])
    const cached = text ? cache[cacheKey(text, direction)] : undefined

    useEffect(() => {
        setRemote(null)
        setLoading(false)
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
    }, [text, direction.from, local, cached, online])

    if (!text) return { text: null, direction, source: null, loading: false, failed: false }
    if (local) return { text: local, direction, source: 'local', loading: false, failed: false }
    if (cached !== undefined) return { text: cached, direction, source: 'online', loading: false, failed: false }
    if (loading) return { text: null, direction, source: null, loading: true, failed: false }
    if (remote?.query === text) {
        return { text: remote.text, direction, source: remote.text ? 'online' : null, loading: false, failed: !remote.text }
    }
    return { text: null, direction, source: null, loading: false, failed: !online }
}
