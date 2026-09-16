/**
 * Rebuilds public/words/{A1..C1}.json.
 *
 * Meanings come from FreeDict eng-tur (GPL-2.0+), levels from the OpenSubtitles
 * frequency list (MIT): the more common a word is, the lower its level. Words that
 * are already in the lists keep their hand-written meaning and their level.
 *
 * Usage: node tools/build-words.mjs
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CACHE = join(import.meta.dirname, '.cache')
const WORDS = join(import.meta.dirname, '..', 'public', 'words')
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
/** How many words each level holds, easiest first. */
const SIZES = { A1: 500, A2: 500, B1: 600, B2: 700, C1: 700 }

const SOURCES = {
    'eng-tur.tei': 'https://raw.githubusercontent.com/freedict/fd-dictionaries/master/eng-tur/eng-tur.tei',
    'en_50k.txt': 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt',
}

async function cached(name) {
    mkdirSync(CACHE, { recursive: true })
    const file = join(CACHE, name)
    if (!existsSync(file)) {
        process.stdout.write(`downloading ${name}… `)
        const response = await fetch(SOURCES[name])
        if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)
        writeFileSync(file, Buffer.from(await response.arrayBuffer()))
        console.log('ok')
    }
    return readFileSync(file, 'utf8')
}

const decode = (text) =>
    text
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')

/** Drops subject labels like "(müz.)" and trailing punctuation. */
function cleanMeaning(raw) {
    return decode(raw)
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[,;:.\s]+|[,;:.\s]+$/g, '')
        .trim()
}

/** word -> Turkish meaning, built from the first senses that give a short, usable gloss. */
function parseDictionary(tei) {
    const meanings = new Map()
    for (const [, entry] of tei.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
        const orth = entry.match(/<orth>([^<]+)<\/orth>/)?.[1]
        if (!orth) continue
        const word = decode(orth).trim().toLowerCase()
        if (meanings.has(word)) continue

        const quotes = [...entry.matchAll(/<quote>([^<]*)<\/quote>/g)]
            .map((m) => cleanMeaning(m[1]))
            // A capital first letter marks a proper noun ("Japonya") and a period marks a
            // sentence-long explanation; neither works as a flashcard gloss.
            .filter(
                (q) =>
                    q &&
                    !/[.?!]/.test(q) &&
                    !/^[A-ZÇĞİÖŞÜ]/.test(q) &&
                    !/^[0-9]/.test(q) &&
                    // Some entries leave English text in the gloss ("half a dozen of another ya bu").
                    // Spaces, not \b: \b treats Turkish letters as boundaries, so "ağaç" would match "a".
                    !/(^|\s)(a|an|the|of|to|in|is|are|and|or|for|with|that|this|it)(\s|$)/i.test(q),
            )
        const usable = quotes.filter((q) => !/[()0-9]/.test(q))
        const short = usable.filter((q) => q.length <= 32)
        const picked = (short.length ? short : usable).slice(0, 2)
        if (!picked.length) continue
        const meaning = picked.join(', ')
        if (meaning.length > 60) continue
        meanings.set(word, meaning)
    }
    return meanings
}

function parseFrequency(text) {
    return text
        .split('\n')
        .map((line) => line.split(' ')[0])
        .filter((word) => /^[a-z]{3,}$/.test(word))
}

function readExisting() {
    const byLevel = new Map(LEVELS.map((level) => [level, []]))
    const taken = new Set()
    for (const level of LEVELS) {
        const file = join(WORDS, `${level}.json`)
        if (!existsSync(file)) continue
        for (const [word, meaning] of JSON.parse(readFileSync(file, 'utf8'))) {
            const key = word.toLowerCase()
            if (taken.has(key)) continue
            taken.add(key)
            byLevel.get(level).push([word, meaning])
        }
    }
    return { byLevel, taken }
}

function write(level, rows) {
    const lines = []
    for (let i = 0; i < rows.length; i += 8) lines.push(rows.slice(i, i + 8).map((r) => JSON.stringify(r)).join(','))
    writeFileSync(join(WORDS, `${level}.json`), `[\n${lines.join(',\n')}\n]\n`)
}

const [tei, freq] = await Promise.all([cached('eng-tur.tei'), cached('en_50k.txt')])
/** FreeDict has no usable gloss for these everyday words, so they are written by hand. */
const OVERRIDES = {
    hello: 'merhaba',
    hi: 'selam',
    hey: 'hey, selam',
    bye: 'hoşça kal',
    goodbye: 'güle güle',
    yes: 'evet',
    no: 'hayır',
    please: 'lütfen',
    thanks: 'teşekkürler',
    thank: 'teşekkür etmek',
    sorry: 'üzgünüm',
    welcome: 'hoş geldin',
    okay: 'tamam',
    sure: 'elbette',
    maybe: 'belki',
    yay: 'yaşasın',
    six: 'altı',
    running: 'koşma',
}
/** Proper nouns and abbreviations that slipped through the frequency list. */
const DROP = new Set(['jimmy', 'luke', 'mark', 'bill', 'jack', 'nick', 'rose'])

const meanings = parseDictionary(tei)
for (const [word, meaning] of Object.entries(OVERRIDES)) meanings.set(word, meaning)
for (const word of DROP) meanings.delete(word)
// "fell → fall" style cross-references point at another English headword, not a translation.
for (const [word, meaning] of meanings) if (meanings.has(meaning) && meaning !== word) meanings.delete(word)
// Short everyday words ("hi", "no") never pass the frequency filter, so they lead the list.
const ranked = [...Object.keys(OVERRIDES), ...parseFrequency(freq)].filter(
    (word, i, list) => meanings.has(word) && list.indexOf(word) === i,
)
console.log(`dictionary: ${meanings.size} words · ranked with a meaning: ${ranked.length}`)

const { byLevel, taken } = readExisting()
let cursor = 0
for (const level of LEVELS) {
    const rows = byLevel.get(level)
    const target = SIZES[level]
    while (rows.length < target && cursor < ranked.length) {
        const word = ranked[cursor++]
        if (taken.has(word)) continue
        taken.add(word)
        rows.push([word, meanings.get(word)])
    }
    write(level, rows)
    console.log(`${level}: ${rows.length} words`)
}
