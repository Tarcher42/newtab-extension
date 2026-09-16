import {
    addKnown,
    advanceWord,
    allWords,
    browseWords,
    knownEntries,
    markKnown,
    nextWord,
    normalizeKnown,
    pickDaily,
    pool,
    removeKnown,
    todayWord,
    type WordList,
} from '../../src/word/logic'
import { lookup, parseWiktionary, stripHtml } from '../../src/word/wiktionary'
import { DEFAULT_WORD_STATE } from '../../src/shared/defaults'
import type { Word, WordState } from '../../src/shared/types'

const list: WordList = {
    A1: [['apple', 'elma']],
    A2: [],
    B1: [
        ['thought', 'düşünce'],
        ['borrow', 'ödünç almak'],
        ['achieve', 'başarmak'],
    ],
    B2: [],
    C1: [['prerequisite', 'ön koşul']],
}
const custom: Word[] = [{ word: 'deploy', meaning: 'yayına almak', level: 'C1' }]
const state = (over: Partial<WordState> = {}): WordState => ({ ...DEFAULT_WORD_STATE, ...over })

describe('normalizeKnown', () => {
    test('accepts the old string list and leaves the date empty', () => {
        expect(normalizeKnown(['apple', 'Borrow'])).toEqual([
            { word: 'apple', at: null },
            { word: 'Borrow', at: null },
        ])
    })

    test('keeps dated entries and drops duplicates and junk', () => {
        expect(normalizeKnown([{ word: 'apple', at: 5 }, { word: 'APPLE', at: 9 }, null, 42, { at: 1 }])).toEqual([
            { word: 'apple', at: 5 },
        ])
    })

    test('anything else becomes an empty list', () => expect(normalizeKnown('nope')).toEqual([]))
})

describe('pool', () => {
    test('uses the chosen level plus custom words', () => {
        expect(pool(list, 'B1', custom, []).map((w) => w.word)).toEqual(['thought', 'borrow', 'achieve', 'deploy'])
    })

    test('excludes known words case-insensitively', () => {
        expect(pool(list, 'B1', custom, normalizeKnown(['Borrow', 'deploy'])).map((w) => w.word)).toEqual(['thought', 'achieve'])
    })
})

test('allWords covers every level with custom words first', () => {
    expect(allWords(list, custom).map((w) => w.word)).toEqual(['deploy', 'apple', 'thought', 'borrow', 'achieve', 'prerequisite'])
})

describe('daily selection', () => {
    const words = pool(list, 'B1', [], [])

    test('pickDaily is stable for a day', () => {
        expect(pickDaily(words, '2026-09-16')).toEqual(pickDaily(words, '2026-09-16'))
    })

    test('nextWord wraps around', () => expect(nextWord(words, 'achieve')?.word).toBe('thought'))

    test('todayWord keeps the stored word for the same day', () => {
        const s = state({ today: { date: '2026-09-16', word: 'borrow' } })
        const result = todayWord(s, words, '2026-09-16')
        expect(result.word?.word).toBe('borrow')
        expect(result.state).toBe(s)
    })

    test('advanceWord moves to the next word', () => {
        const s = state({ today: { date: '2026-09-16', word: 'thought' } })
        expect(advanceWord(s, words, '2026-09-16').today?.word).toBe('borrow')
    })
})

describe('known words', () => {
    const words = pool(list, 'B1', [], [])

    test('markKnown stores the date and shows the word that took its place', () => {
        const next = markKnown(state({ today: { date: '2026-09-16', word: 'borrow' } }), words, 'borrow', '2026-09-16', 1000)
        expect(next.known).toEqual([{ word: 'borrow', at: 1000 }])
        expect(next.today?.word).toBe('achieve')
    })

    test('marking the last word known empties today', () => {
        const single = pool(list, 'A1', [], [])
        expect(markKnown(state(), single, 'apple', '2026-09-16', 1).today).toBeNull()
    })

    test('addKnown ignores a word that is already known', () => {
        const once = addKnown(state(), 'apple', 1)
        expect(addKnown(once, 'APPLE', 2)).toBe(once)
    })

    test('removeKnown puts the word back into the pool', () => {
        const s = addKnown(state(), 'borrow', 1)
        expect(pool(list, 'B1', [], s.known).map((w) => w.word)).not.toContain('borrow')
        const restored = removeKnown(s, 'Borrow')
        expect(restored.known).toEqual([])
        expect(pool(list, 'B1', [], restored.known).map((w) => w.word)).toContain('borrow')
    })

    test('knownEntries are newest first with meanings, undated last', () => {
        const s = state({ known: [{ word: 'apple', at: 10 }, { word: 'borrow', at: null }, { word: 'thought', at: 50 }] })
        expect(knownEntries(s, list, []).map((e) => [e.word, e.meaning, e.level])).toEqual([
            ['thought', 'düşünce', 'B1'],
            ['apple', 'elma', 'A1'],
            ['borrow', 'ödünç almak', 'B1'],
        ])
    })

    test('knownEntries survive a missing word list', () => {
        const s = state({ known: [{ word: 'gone', at: 1 }] })
        expect(knownEntries(s, null, [])).toEqual([{ word: 'gone', meaning: '', level: null, at: 1 }])
    })
})

describe('browseWords', () => {
    const s = state({ custom, known: [{ word: 'apple', at: 10 }] })

    test('all rows carry the known flag', () => {
        const rows = browseWords(s, list, 'all', '')
        expect(rows).toHaveLength(6)
        expect(rows.find((r) => r.word === 'apple')).toMatchObject({ known: true, at: 10 })
        expect(rows.find((r) => r.word === 'thought')?.known).toBe(false)
    })

    test('known filter shows only known words', () => {
        expect(browseWords(s, list, 'known', '').map((r) => r.word)).toEqual(['apple'])
    })

    test('custom filter shows only the user words', () => {
        expect(browseWords(s, list, 'custom', '').map((r) => r.word)).toEqual(['deploy'])
    })

    test('search matches the word or the Turkish meaning', () => {
        expect(browseWords(s, list, 'all', 'THOU').map((r) => r.word)).toEqual(['thought'])
        expect(browseWords(s, list, 'all', 'ödünç').map((r) => r.word)).toEqual(['borrow'])
    })

    test('search with no hit returns nothing', () => expect(browseWords(s, list, 'all', 'zzz')).toEqual([]))
})

const sample = {
    en: [
        {
            partOfSpeech: 'Noun',
            language: 'English',
            definitions: [
                { definition: '<span>A <a href="/wiki/thing">thing</a> required beforehand.</span>', parsedExamples: [] },
                {
                    definition: 'Something &quot;needed&quot; first.',
                    parsedExamples: [{ example: '<i>Maths is a prerequisite for physics.</i>' }],
                },
            ],
        },
    ],
    tr: [{ partOfSpeech: 'Noun', definitions: [{ definition: 'ön koşul' }] }],
}

describe('wiktionary', () => {
    test('stripHtml removes tags and decodes entities', () => {
        expect(stripHtml('<b>a</b> &amp; b &#39;c&#39;')).toBe("a & b 'c'")
    })

    test('prefers the definition that has an example', () => {
        expect(parseWiktionary(sample)).toEqual({
            partOfSpeech: 'Noun',
            definition: 'Something "needed" first.',
            example: 'Maths is a prerequisite for physics.',
        })
    })

    test('falls back to the first definition when none has an example', () => {
        const noExample = { en: [{ partOfSpeech: 'Verb', definitions: [{ definition: 'To do a thing.' }] }] }
        expect(parseWiktionary(noExample)).toEqual({ partOfSpeech: 'Verb', definition: 'To do a thing.' })
    })

    test('ignores entries without an English section', () => {
        expect(parseWiktionary({ tr: sample.tr })).toEqual({})
        expect(parseWiktionary('nope')).toEqual({})
    })

    test('lookup caches successful results and reuses them', async () => {
        const fetchFn = vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 }))
        const first = await lookup('Prerequisite', fetchFn, {})
        expect(first.data?.definition).toBe('Something "needed" first.')
        const second = await lookup('prerequisite', fetchFn, first.cache)
        expect(second.data).toEqual(first.data)
        expect(fetchFn).toHaveBeenCalledTimes(1)
    })

    test('lookup caches a 404 as empty data', async () => {
        const result = await lookup('zzqq', async () => new Response('{}', { status: 404 }), {})
        expect(result.data).toEqual({})
        expect(result.cache.zzqq).toEqual({})
    })

    test('network and server errors are not cached', async () => {
        expect(await lookup('a', async () => Promise.reject(new TypeError('offline')), {})).toEqual({ data: null, cache: {} })
        expect(await lookup('a', async () => new Response('', { status: 503 }), {})).toEqual({ data: null, cache: {} })
    })
})
