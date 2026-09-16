import { useEffect, useState } from 'preact/hooks'
import type { DictionaryData } from '../shared/types'
import { update } from '../storage/store'
import { useStorageArea, useStored } from '../storage/useStored'
import { lookup } from './wiktionary'

/** Wiktionary sometimes stalls; the widget falls back to the local data instead of waiting. */
const fetchWithTimeout = (url: string) => fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(8000) })

/** Definition and example for a word, cached in storage so a word is only fetched once. */
export function useWordDetails(word: string | null): DictionaryData | null {
    const area = useStorageArea()
    const [state] = useStored('word')
    const [details, setDetails] = useState<DictionaryData | null>(null)

    useEffect(() => {
        setDetails(null)
        if (!word) return
        let active = true
        lookup(word, fetchWithTimeout, state.cache).then(async (result) => {
            if (!active) return
            setDetails(result.data)
            if (result.cache !== state.cache) {
                const k = word.trim().toLocaleLowerCase('en-US')
                await update(area, 'word', (s) => ({ ...s, cache: { ...s.cache, [k]: result.cache[k] } }))
            }
        })
        return () => {
            active = false
        }
    }, [word])

    return details
}

/** Pronunciation comes from the browser's own voices: no network, no extra permission. */
export function speak(word: string): void {
    if (!('speechSynthesis' in window)) return
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
}
