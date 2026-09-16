import type { Level } from '../shared/types'
import { LEVELS, type WordList } from './logic'

let listPromise: Promise<WordList> | null = null

/** Loads the bundled word lists once per page and retries after a failure. */
export function loadWordList(): Promise<WordList> {
    listPromise ??= Promise.all(
        LEVELS.map((level) => fetch(`words/${level}.json`).then((r) => r.json() as Promise<WordList[Level]>)),
    ).then((lists) => Object.fromEntries(LEVELS.map((level, i) => [level, lists[i]])) as WordList)
    listPromise.catch(() => (listPromise = null))
    return listPromise
}
