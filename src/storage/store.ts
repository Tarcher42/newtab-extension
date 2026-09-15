import { DEFAULT_COMMANDS, DEFAULT_GROUPS, DEFAULT_SETTINGS, DEFAULT_TIMER, DEFAULT_WORD_STATE } from '../shared/defaults'
import type { Command, FaviconCache, Groups, Session, Settings, TimerState, WordState } from '../shared/types'
import type { StorageArea } from './area'
import { migrateSettings } from './migrate'

export type StoreShape = {
    settings: Settings
    groups: Groups
    commands: Command[]
    timer: TimerState
    sessions: Session[]
    word: WordState
    favicons: FaviconCache
}

export type StoreKey = keyof StoreShape

const DEFAULTS: StoreShape = {
    settings: DEFAULT_SETTINGS,
    groups: DEFAULT_GROUPS,
    commands: DEFAULT_COMMANDS,
    timer: DEFAULT_TIMER,
    sessions: [],
    word: DEFAULT_WORD_STATE,
    favicons: {},
}

export const STORE_KEYS = Object.keys(DEFAULTS) as StoreKey[]

export function defaultsFor<K extends StoreKey>(key: K): StoreShape[K] {
    return structuredClone(DEFAULTS[key])
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Fills missing fields from `base`; nested plain objects are merged one level at a time. */
function mergeDefaults<T>(base: T, raw: unknown): T {
    if (!isObject(base) || !isObject(raw)) return base
    const out: Record<string, unknown> = { ...base }
    for (const [key, baseValue] of Object.entries(base)) {
        if (!(key in raw)) continue
        const value = raw[key]
        if (isObject(baseValue)) out[key] = mergeDefaults(baseValue, value)
        else if (Array.isArray(baseValue)) out[key] = Array.isArray(value) ? value : baseValue
        else if (baseValue === null || typeof value === typeof baseValue) out[key] = value
    }
    return out as T
}

/** Built-in actions can be renamed but never removed. */
function withBuiltInActions(commands: Command[]): Command[] {
    const missing = DEFAULT_COMMANDS.filter(
        (def) => def.kind === 'action' && !commands.some((c) => c.kind === 'action' && c.actionId === def.actionId),
    )
    return [...commands, ...structuredClone(missing)]
}

export function normalize<K extends StoreKey>(key: K, raw: unknown): StoreShape[K] {
    const fallback = defaultsFor(key)
    if (raw === undefined || raw === null) return fallback

    switch (key) {
        case 'settings':
            return mergeDefaults(fallback, migrateSettings(raw)) as StoreShape[K]
        case 'groups': {
            const g = isObject(raw) ? raw : {}
            return {
                left: Array.isArray(g.left) ? g.left : [],
                right: Array.isArray(g.right) ? g.right : [],
            } as StoreShape[K]
        }
        case 'commands':
            return (Array.isArray(raw) ? withBuiltInActions(raw as Command[]) : fallback) as StoreShape[K]
        case 'sessions':
            return (Array.isArray(raw) ? raw : fallback) as StoreShape[K]
        case 'favicons':
            return (isObject(raw) ? raw : fallback) as StoreShape[K]
        default:
            return mergeDefaults(fallback, raw)
    }
}

export async function load<K extends StoreKey>(area: StorageArea, key: K): Promise<StoreShape[K]> {
    return normalize(key, await area.get(key))
}

export async function save<K extends StoreKey>(area: StorageArea, key: K, value: StoreShape[K]): Promise<void> {
    await area.set({ [key]: value })
}

export async function update<K extends StoreKey>(
    area: StorageArea,
    key: K,
    fn: (current: StoreShape[K]) => StoreShape[K],
): Promise<StoreShape[K]> {
    const next = fn(await load(area, key))
    await save(area, key, next)
    return next
}
