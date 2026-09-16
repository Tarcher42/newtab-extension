import { useEffect, useMemo, useState } from 'preact/hooks'
import { dayKey } from '../shared/time'
import type { DictionaryData } from '../shared/types'
import { update } from '../storage/store'
import { useStorageArea, useStored } from '../storage/useStored'
import { KnownList } from './KnownList'
import { loadWordList } from './list'
import { advanceWord, knownEntries, markKnown, pool, removeKnown, todayWord, type WordList } from './logic'
import { lookup } from './wiktionary'

export const WORD_NEXT_EVENT = 'newtab:word-next'

/** Pronunciation comes from the browser's own voices, so it needs no network and no extra permission. */
function speak(word: string) {
    if (!('speechSynthesis' in window)) return
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
}

export function WordWidget() {
    const area = useStorageArea()
    const [state, setState, loaded] = useStored('word')
    const [settings] = useStored('settings')
    const [list, setList] = useState<WordList | null>(null)
    const [details, setDetails] = useState<DictionaryData | null>(null)
    const [tab, setTab] = useState<'today' | 'known'>('today')
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

    const entries = useMemo(() => knownEntries(state, list, state.custom), [state.known, list, state.custom])

    return (
        <section class="widget glass word" aria-label="Günün kelimesi">
            <div class="word-top">
                <h2 class="widget-title">Günün kelimesi</h2>
                {tab === 'today' && word && <span class="word-level">{word.level}</span>}
            </div>
            <div class="word-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'today'} onClick={() => setTab('today')}>
                    Bugün
                </button>
                <button type="button" role="tab" aria-selected={tab === 'known'} onClick={() => setTab('known')}>
                    Öğrendiklerim
                </button>
            </div>

            {tab === 'known' ? (
                <KnownList entries={entries} onRestore={(w) => setState(removeKnown(state, w))} />
            ) : !list ? null : !word ? (
                <>
                    <p class="word-empty">Bu seviyedeki tüm kelimeleri biliyorsun 🎉</p>
                    <p class="word-empty-hint">Ayarlar → Widget'lar bölümünden seviyeyi değiştirebilir ya da bilinen kelimeleri geri alabilirsin.</p>
                </>
            ) : (
                <>
                    <div class="word-head">
                        <span class="word-text" lang="en">
                            {word.word}
                        </span>
                        <button type="button" class="word-audio" aria-label="Telaffuzu dinle" onClick={() => speak(word.word)}>
                            🔊
                        </button>
                    </div>
                    <div class="word-meaning">{word.meaning}</div>
                    {details?.definition && (
                        <p class="word-definition" lang="en">
                            {details.partOfSpeech && <span class="word-pos">{details.partOfSpeech}</span>}
                            {details.definition}
                        </p>
                    )}
                    {details?.example && (
                        <p class="word-example" lang="en">
                            “{details.example}”
                        </p>
                    )}
                    <div class="word-actions">
                        <button type="button" class="btn" onClick={() => setState(markKnown(state, words, word.word, day, Date.now()))}>
                            Biliyorum
                        </button>
                        <button type="button" class="btn btn-primary" onClick={() => setState(advanceWord(state, words, day))}>
                            Sonraki
                        </button>
                    </div>
                </>
            )}
        </section>
    )
}
