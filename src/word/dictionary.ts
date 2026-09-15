import type { DictionaryData } from '../shared/types'

export type FetchFn = (url: string) => Promise<Response>

type Entry = {
    phonetic?: string
    phonetics?: { text?: string; audio?: string }[]
    meanings?: { definitions?: { definition?: string; example?: string }[] }[]
}

export function parseDictionary(json: unknown): DictionaryData {
    const entries = Array.isArray(json) ? (json as Entry[]) : []
    const phonetics = entries.flatMap((e) => e.phonetics ?? [])
    const definitions = entries.flatMap((e) => e.meanings ?? []).flatMap((m) => m.definitions ?? [])

    const data: DictionaryData = {}
    const phonetic = entries.find((e) => e.phonetic)?.phonetic ?? phonetics.find((p) => p.text)?.text
    const audio = phonetics.find((p) => p.audio)?.audio
    const definition = definitions.find((d) => d.definition)?.definition
    const example = definitions.find((d) => d.example)?.example
    if (phonetic) data.phonetic = phonetic
    if (audio) data.audio = audio
    if (definition) data.definition = definition
    if (example) data.example = example
    return data
}

export type LookupResult = { data: DictionaryData | null; cache: Record<string, DictionaryData> }

/**
 * A 404 means the dictionary has no entry, which is cached as empty data so it is not
 * requested again. Network and server errors are not cached; the widget simply shows
 * the local word data until a later lookup succeeds.
 */
export async function lookup(word: string, fetchFn: FetchFn, cache: Record<string, DictionaryData>): Promise<LookupResult> {
    const k = word.trim().toLocaleLowerCase('en-US')
    if (k in cache) return { data: cache[k], cache }
    try {
        const response = await fetchFn(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(k)}`)
        if (response.status === 404) return { data: {}, cache: { ...cache, [k]: {} } }
        if (!response.ok) return { data: null, cache }
        const data = parseDictionary(await response.json())
        return { data, cache: { ...cache, [k]: data } }
    } catch {
        return { data: null, cache }
    }
}
