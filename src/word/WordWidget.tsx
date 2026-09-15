import { useEffect, useMemo, useState } from 'preact/hooks'
import { dayKey } from '../shared/time'
import type { DictionaryData, Level } from '../shared/types'
import { update } from '../storage/store'
import { useStorageArea, useStored } from '../storage/useStored'
import { lookup } from './dictionary'
import { advanceWord, markKnown, pool, todayWord, type WordList } from './logic'

export const WORD_NEXT_EVENT = 'newtab:word-next'

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1']

let listPromise: Promise<WordList> | null = null
export function loadWordList(): Promise<WordList> {
    listPromise ??= Promise.all(
        LEVELS.map((level) => fetch(`words/${level}.json`).then((r) => r.json() as Promise<WordList[Level]>)),
    ).then((lists) => Object.fromEntries(LEVELS.map((level, i) => [level, lists[i]])) as WordList)
    listPromise.catch(() => (listPromise = null))
    return listPromise
}

export function WordWidget() {
    const area = useStorageArea()
    const [state, setState, loaded] = useStored('word')
    const [settings] = useStored('settings')
    const [list, setList] = useState<WordList | null>(null)
    const [details, setDetails] = useState<DictionaryData | null>(null)
    const day = dayKey(new Date())

    useEffect(() => {
        loadWordList()
            .then(setList)
            .catch(() => setList(null))
    }, [])

    const words = useMemo(
        () => (list ? pool(list, settings.wordLevel, state.custom, state.known) : []),
        [list, settings.wordLevel, state.custom, state.known],
    )
    const current = loaded && list ? todayWord(state, words, day) : null
    const word = current?.word ?? null

    useEffect(() => {
        if (current && current.state !== state) setState(current.state)
    }, [current?.state])

    useEffect(() => {
        const onNext = () => setState(advanceWord(state, words, day))
        window.addEventListener(WORD_NEXT_EVENT, onNext)
        return () => window.removeEventListener(WORD_NEXT_EVENT, onNext)
    }, [state, words, day])

    useEffect(() => {
        setDetails(null)
        if (!word) return
        let active = true
        // The dictionary service sometimes hangs until Cloudflare gives up; fall back to local data sooner.
        const fetchWithTimeout = (url: string) => fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(8000) })
        lookup(word.word, fetchWithTimeout, state.cache).then(async (result) => {
            if (!active) return
            setDetails(result.data)
            if (result.cache !== state.cache) {
                const key = word.word.trim().toLocaleLowerCase('en-US')
                await update(area, 'word', (s) => ({ ...s, cache: { ...s.cache, [key]: result.cache[key] } }))
            }
        })
        return () => {
            active = false
        }
    }, [word?.word])

    if (!list) {
        return (
            <section class="widget glass word" aria-label="Günün kelimesi">
                <h2 class="widget-title">Günün kelimesi</h2>
            </section>
        )
    }

    if (!word) {
        return (
            <section class="widget glass word" aria-label="Günün kelimesi">
                <h2 class="widget-title">Günün kelimesi</h2>
                <p class="word-empty">Bu seviyedeki tüm kelimeleri biliyorsun 🎉</p>
                <p class="word-empty-hint">Ayarlar → Widget'lar bölümünden seviyeyi değiştirebilir ya da bilinen kelimeleri sıfırlayabilirsin.</p>
            </section>
        )
    }

    return (
        <section class="widget glass word" aria-label="Günün kelimesi">
            <div class="word-top">
                <h2 class="widget-title">Günün kelimesi</h2>
                <span class="word-level">{word.level}</span>
            </div>
            <div class="word-head">
                <span class="word-text" lang="en">
                    {word.word}
                </span>
                {details?.audio && (
                    <button type="button" class="word-audio" aria-label="Telaffuzu dinle" onClick={() => void new Audio(details.audio).play()}>
                        🔊
                    </button>
                )}
            </div>
            {details?.phonetic && <div class="word-phonetic">{details.phonetic}</div>}
            <div class="word-meaning">{word.meaning}</div>
            {details?.definition && (
                <p class="word-definition" lang="en">
                    {details.definition}
                </p>
            )}
            {details?.example && (
                <p class="word-example" lang="en">
                    “{details.example}”
                </p>
            )}
            <div class="word-actions">
                <button type="button" class="btn" onClick={() => setState(markKnown(state, words, word.word, day))}>
                    Biliyorum
                </button>
                <button type="button" class="btn btn-primary" onClick={() => setState(advanceWord(state, words, day))}>
                    Sonraki
                </button>
            </div>
        </section>
    )
}
