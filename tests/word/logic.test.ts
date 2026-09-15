import { lookup, parseDictionary } from '../../src/word/dictionary'
import { advanceWord, markKnown, nextWord, pickDaily, pool, todayWord, type WordList } from '../../src/word/logic'
import { DEFAULT_WORD_STATE } from '../../src/shared/defaults'
import type { Word } from '../../src/shared/types'

const list: WordList = {
    A1: [['apple', 'elma']],
    A2: [],
    B1: [
        ['thought', 'düşünce'],
        ['borrow', 'ödünç almak'],
        ['achieve', 'başarmak'],
    ],
    B2: [],
    C1: [],
}
const custom: Word[] = [{ word: 'deploy', meaning: 'yayına almak', level: 'C1' }]

describe('pool', () => {
    test('uses the chosen level plus custom words', () => {
        expect(pool(list, 'B1', custom, []).map((w) => w.word)).toEqual(['thought', 'borrow', 'achieve', 'deploy'])
    })

    test('excludes known words case-insensitively', () => {
        expect(pool(list, 'B1', custom, ['Borrow', 'deploy']).map((w) => w.word)).toEqual(['thought', 'achieve'])
    })

    test('drops custom duplicates of built-in words', () => {
        const dup: Word[] = [{ word: 'Thought', meaning: 'x', level: 'B1' }]
        expect(pool(list, 'B1', dup, [])).toHaveLength(3)
    })
})

describe('daily selection', () => {
    const words = pool(list, 'B1', [], [])

    test('pickDaily is stable for a day', () => {
        expect(pickDaily(words, '2026-09-16')).toEqual(pickDaily(words, '2026-09-16'))
    })

    test('pickDaily on an empty pool is null', () => expect(pickDaily([], '2026-09-16')).toBeNull())

    test('nextWord wraps around', () => {
        expect(nextWord(words, 'achieve')?.word).toBe('thought')
        expect(nextWord(words, 'thought')?.word).toBe('borrow')
    })

    test('todayWord keeps the stored word for the same day', () => {
        const state = { ...DEFAULT_WORD_STATE, today: { date: '2026-09-16', word: 'borrow' } }
        const result = todayWord(state, words, '2026-09-16')
        expect(result.word?.word).toBe('borrow')
        expect(result.state).toBe(state)
    })

    test('todayWord picks again on a new day', () => {
        const state = { ...DEFAULT_WORD_STATE, today: { date: '2026-09-15', word: 'borrow' } }
        const result = todayWord(state, words, '2026-09-16')
        expect(result.state.today).toEqual({ date: '2026-09-16', word: pickDaily(words, '2026-09-16')!.word })
    })

    test('advanceWord moves to the next word', () => {
        const state = { ...DEFAULT_WORD_STATE, today: { date: '2026-09-16', word: 'thought' } }
        expect(advanceWord(state, words, '2026-09-16').today?.word).toBe('borrow')
    })

    test('markKnown stores the word and shows the one that took its place', () => {
        const state = { ...DEFAULT_WORD_STATE, today: { date: '2026-09-16', word: 'borrow' } }
        const next = markKnown(state, words, 'borrow', '2026-09-16')
        expect(next.known).toEqual(['borrow'])
        expect(next.today?.word).toBe('achieve')
    })

    test('marking the last word known empties today', () => {
        const single = pool(list, 'A1', [], [])
        expect(markKnown(DEFAULT_WORD_STATE, single, 'apple', '2026-09-16').today).toBeNull()
    })
})

const sample = [
    {
        word: 'thought',
        phonetic: '/θɔːt/',
        phonetics: [
            { text: '/θɔːt/', audio: '' },
            { text: '/θɔt/', audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/thought-us.mp3' },
        ],
        meanings: [
            {
                partOfSpeech: 'verb',
                definitions: [
                    { definition: "To ponder, to go over in one's head.", example: 'Idly, the detective thought what his next move should be.' },
                ],
            },
        ],
    },
]

describe('dictionary', () => {
    test('parseDictionary takes the first useful values', () => {
        expect(parseDictionary(sample)).toEqual({
            phonetic: '/θɔːt/',
            audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/thought-us.mp3',
            definition: "To ponder, to go over in one's head.",
            example: 'Idly, the detective thought what his next move should be.',
        })
    })

    test('parseDictionary tolerates junk', () => expect(parseDictionary({ title: 'No Definitions Found' })).toEqual({}))

    test('lookup caches successful results', async () => {
        const fetchFn = vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 }))
        const first = await lookup('Thought', fetchFn, {})
        expect(first.data?.phonetic).toBe('/θɔːt/')
        const second = await lookup('thought', fetchFn, first.cache)
        expect(second.data).toEqual(first.data)
        expect(fetchFn).toHaveBeenCalledTimes(1)
    })

    test('lookup caches a 404 as empty data', async () => {
        const result = await lookup('zzqq', async () => new Response('{}', { status: 404 }), {})
        expect(result.data).toEqual({})
        expect(result.cache.zzqq).toEqual({})
    })

    test('network and server errors are not cached', async () => {
        const offline = await lookup('a', async () => Promise.reject(new TypeError('offline')), {})
        expect(offline).toEqual({ data: null, cache: {} })
        const down = await lookup('a', async () => new Response('', { status: 522 }), {})
        expect(down).toEqual({ data: null, cache: {} })
    })
})
