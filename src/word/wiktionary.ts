import type { DictionaryData } from '../shared/types'

export type FetchFn = (url: string) => Promise<Response>

type Definition = { definition?: string; examples?: string[]; parsedExamples?: { example?: string }[] }
type Section = { language?: string; partOfSpeech?: string; definitions?: Definition[] }

const ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
}

/** Wiktionary returns small HTML fragments; the widget shows plain text. */
export function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
        .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match)
        .replace(/\s+/g, ' ')
        .trim()
}

/** Wiktionary often packs several sentences into one definition; the widget shows the first. */
export function firstSentence(text: string): string {
    const end = text.search(/[.!?](\s|$)/)
    return end === -1 || end < 20 ? text : text.slice(0, end + 1)
}

/** First English definition with an example if one exists, otherwise the first definition. */
export function parseWiktionary(json: unknown): DictionaryData {
    const sections = (json as Record<string, Section[]> | null)?.en
    if (!Array.isArray(sections)) return {}

    const definitions = sections.flatMap((section) =>
        (section.definitions ?? []).map((d) => ({ ...d, partOfSpeech: section.partOfSpeech })),
    )
    const exampleOf = (d: Definition) => d.parsedExamples?.find((e) => e.example)?.example ?? d.examples?.find(Boolean)
    const withText = definitions.filter((d) => d.definition && stripHtml(d.definition))
    const chosen = withText.find((d) => exampleOf(d)) ?? withText[0]
    if (!chosen) return {}

    const data: DictionaryData = { definition: firstSentence(stripHtml(chosen.definition!)) }
    if (chosen.partOfSpeech) data.partOfSpeech = chosen.partOfSpeech
    const example = exampleOf(chosen)
    if (example) data.example = stripHtml(example)
    return data
}

export type LookupResult = { data: DictionaryData | null; cache: Record<string, DictionaryData> }

/**
 * A 404 means Wiktionary has no English entry, which is cached as empty data so it is not
 * requested again. Network and server errors are not cached; the widget falls back to the
 * local word data until a later lookup succeeds.
 */
export async function lookup(word: string, fetchFn: FetchFn, cache: Record<string, DictionaryData>): Promise<LookupResult> {
    const k = word.trim().toLocaleLowerCase('en-US')
    if (k in cache) return { data: cache[k], cache }
    try {
        const response = await fetchFn(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(k)}?redirect=true`)
        if (response.status === 404) return { data: {}, cache: { ...cache, [k]: {} } }
        if (!response.ok) return { data: null, cache }
        const data = parseWiktionary(await response.json())
        return { data, cache: { ...cache, [k]: data } }
    } catch {
        return { data: null, cache }
    }
}
