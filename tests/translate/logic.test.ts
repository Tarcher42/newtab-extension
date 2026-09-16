import { TRANSLATE_TEMPLATE } from '../../src/shared/defaults'
import { buildIndex, buildTranslateUrl, detectDirection, directionLabel, localTranslate } from '../../src/translate/logic'
import { cacheKey, parseMyMemory, translateOnline, trimCache } from '../../src/translate/mymemory'
import type { Word } from '../../src/shared/types'
import type { WordList } from '../../src/word/logic'

const list: WordList = {
    A1: [['book', 'kitap']],
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
