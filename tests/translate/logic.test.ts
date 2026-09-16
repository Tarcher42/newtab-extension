import { TRANSLATE_TEMPLATE } from '../../src/shared/defaults'
import { buildIndex, buildTranslateUrl, detectDirection, directionLabel, localTranslate, parseQuery } from '../../src/translate/logic'
import { cacheKey, parseMyMemory, translateOnline, trimCache } from '../../src/translate/mymemory'
import type { Word } from '../../src/shared/types'
import type { WordList } from '../../src/word/logic'

const list: WordList = {
    A1: [
        ['book', 'kitap'],
        ['hello', 'merhaba'],
    ],
    A2: [['strength', 'kuvvet, güç']],
    B1: [['borrow', 'ödünç almak']],
    B2: [],
    C1: [],
}
const custom: Word[] = [{ word: 'deploy', meaning: 'yayına almak', level: 'C1' }]
const index = buildIndex(list, custom)

const EN_TR = { from: 'en', to: 'tr' } as const
const TR_EN = { from: 'tr', to: 'en' } as const

describe('buildIndex', () => {
    test('maps English to Turkish', () => expect(index.en.get('book')).toBe('kitap'))
    test('splits multi-word meanings for the reverse direction', () => {
        expect(index.tr.get('kuvvet')).toBe('strength')
        expect(index.tr.get('güç')).toBe('strength')
    })
    test('includes custom words', () => expect(index.en.get('deploy')).toBe('yayına almak'))
})

describe('detectDirection', () => {
    test('Turkish letters mean TR to EN', () => expect(detectDirection('güç')).toEqual(TR_EN))
    test('a known Turkish word without special letters still means TR to EN', () => {
        expect(detectDirection('kitap', index)).toEqual(TR_EN)
    })
    test('plain English means EN to TR', () => expect(detectDirection('book', index)).toEqual(EN_TR))
    test('a word in both tables stays EN to TR', () => expect(detectDirection('book', buildIndex(null, [{ word: 'book', meaning: 'book', level: 'A1' }]))).toEqual(EN_TR))
    test('empty text defaults to EN to TR', () => expect(detectDirection('  ')).toEqual(EN_TR))
    test('label', () => expect(directionLabel(TR_EN)).toBe('TR→EN'))
})

describe('parseQuery', () => {
    test('plain text has no languages', () => expect(parseQuery('hello world')).toEqual({ text: 'hello world' }))
    test('a single code is the target', () => expect(parseQuery('es merhaba')).toEqual({ text: 'merhaba', to: 'es' }))
    test('a pair sets both', () => expect(parseQuery('en-de hello there')).toEqual({ text: 'hello there', from: 'en', to: 'de' }))
    test('unknown codes stay part of the text', () => expect(parseQuery('xx merhaba')).toEqual({ text: 'xx merhaba' }))
    test('a code alone is just text', () => expect(parseQuery('es')).toEqual({ text: 'es' }))
    test('case does not matter', () => expect(parseQuery('EN-DE hello')).toEqual({ text: 'hello', from: 'en', to: 'de' }))
})

describe('detectDirection with codes', () => {
    test('target only, English text', () => expect(detectDirection('hello', index, parseQuery('es hello'))).toEqual({ from: 'en', to: 'es' }))
    test('target only, Turkish text', () => expect(detectDirection('merhaba', index, parseQuery('es merhaba'))).toEqual({ from: 'tr', to: 'es' }))
    test('target tr keeps English as the source', () => {
        expect(detectDirection('hello', index, parseQuery('tr hello'))).toEqual({ from: 'en', to: 'tr' })
    })
    test('an explicit pair wins', () => {
        expect(detectDirection('hello', index, parseQuery('en-de hello'))).toEqual({ from: 'en', to: 'de' })
    })
    test('the same language twice falls back to auto', () => {
        expect(detectDirection('kitap', index, parseQuery('tr-tr kitap'))).toEqual(TR_EN)
    })
})

describe('localTranslate', () => {
    test('English to Turkish', () => expect(localTranslate('Book', EN_TR, index)).toBe('kitap'))
    test('Turkish to English', () => expect(localTranslate('ödünç almak', TR_EN, index)).toBe('borrow'))
    test('unknown word', () => expect(localTranslate('zzz', EN_TR, index)).toBeNull())
    test('phrases are left to the online service', () => expect(localTranslate('hello world', EN_TR, index)).toBeNull())
})

test('buildTranslateUrl fills text and languages', () => {
    expect(buildTranslateUrl(TRANSLATE_TEMPLATE, 'iyi günler', TR_EN)).toBe(
        'https://translate.yandex.com/?source_lang=tr&target_lang=en&text=iyi%20g%C3%BCnler',
    )
})

describe('mymemory', () => {
    const ok = (text: string) => new Response(JSON.stringify({ responseStatus: 200, responseData: { translatedText: text } }), { status: 200 })

    test('parses a good response', () => expect(parseMyMemory({ responseStatus: 200, responseData: { translatedText: 'merhaba' } })).toBe('merhaba'))
    test('rejects a finished quota', () => {
        expect(parseMyMemory({ responseStatus: 200, quotaFinished: true, responseData: { translatedText: 'x' } })).toBeNull()
    })
    test('rejects an error status', () => expect(parseMyMemory({ responseStatus: 403, responseData: { translatedText: 'x' } })).toBeNull())
    test('rejects junk', () => expect(parseMyMemory(null)).toBeNull())

    test('skips a community entry that is clearly not the word', () => {
        const payload = {
            responseStatus: 200,
            responseData: { translatedText: '- Bu haftasonu ne yaptım.', match: 1 },
            matches: [
                { translation: '- Bu haftasonu ne yaptım.', match: 1 },
                { translation: 'hola sup', match: 0.99 },
                { translation: 'Merhaba. ', match: 0.96 },
            ],
        }
        expect(parseMyMemory(payload, 'hello')).toBe('Merhaba.')
    })

    test('keeps a sentence answer for a sentence', () => {
        const payload = {
            responseStatus: 200,
            responseData: { translatedText: 'Bugün nasılsın?', match: 0.96 },
            matches: [{ translation: 'Bugün nasılsınız?', match: 0.95 }],
        }
        expect(parseMyMemory(payload, 'how are you today?')).toBe('Bugün nasılsın?')
    })

    test('caches by text and direction', async () => {
        const fetchFn = vi.fn(async () => ok('merhaba dünya'))
        const first = await translateOnline('hello world', EN_TR, fetchFn, {})
        expect(first.text).toBe('merhaba dünya')
        expect(first.cache[cacheKey('Hello World', EN_TR)]).toBe('merhaba dünya')

        const second = await translateOnline('hello world', EN_TR, fetchFn, first.cache)
        expect(second.text).toBe('merhaba dünya')
        expect(fetchFn).toHaveBeenCalledTimes(1)

        await translateOnline('hello world', TR_EN, fetchFn, first.cache)
        expect(fetchFn).toHaveBeenCalledTimes(2)
    })

    test('sends the language pair', async () => {
        const fetchFn = vi.fn(async (_url: string) => ok('hello'))
        await translateOnline('merhaba', TR_EN, fetchFn, {})
        expect(fetchFn.mock.calls[0][0]).toContain('langpair=tr|en')
    })

    test('failures are not cached', async () => {
        expect(await translateOnline('x', EN_TR, async () => Promise.reject(new TypeError('offline')), {})).toEqual({ text: null, cache: {} })
        expect(await translateOnline('x', EN_TR, async () => new Response('', { status: 500 }), {})).toEqual({ text: null, cache: {} })
    })

    test('trimCache keeps the newest entries', () => {
        const cache = Object.fromEntries(Array.from({ length: 205 }, (_, i) => [`k${i}`, `v${i}`]))
        const trimmed = trimCache(cache)
        expect(Object.keys(trimmed)).toHaveLength(200)
        expect(trimmed.k204).toBe('v204')
        expect(trimmed.k0).toBeUndefined()
    })
})

test('a repeated translation beats a one-off junk entry', () => {
    const payload = {
        responseStatus: 200,
        responseData: { translatedText: 'Dupligon', match: 0.99 },
        matches: [
            { translation: 'Dupligon', match: 0.99 },
            { translation: 'hola', match: 0.99 },
            { translation: 'Hola', match: 0.98 },
        ],
    }
    expect(parseMyMemory(payload, 'merhaba')).toBe('hola')
})
