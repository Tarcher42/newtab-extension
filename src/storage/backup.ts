import { MAX_PER_GROUP } from '../shortcuts/logic'
import type { StorageArea } from './area'
import { load, normalize, save, type StoreShape } from './store'

const APP_ID = 'newtab'
const EXPORTED_KEYS = ['settings', 'groups', 'commands', 'sessions', 'word'] as const

type ExportedKey = (typeof EXPORTED_KEYS)[number]
export type ImportResult = { ok: true } | { ok: false; error: string }

export async function exportData(area: StorageArea): Promise<string> {
    const data: Partial<StoreShape> = {}
    for (const key of EXPORTED_KEYS) {
        const value = await load(area, key)
        ;(data as Record<ExportedKey, unknown>)[key] = key === 'word' ? { ...(value as StoreShape['word']), cache: {} } : value
    }
    return JSON.stringify({ app: APP_ID, exportedAt: new Date().toISOString(), data }, null, 2)
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isShortcut = (v: unknown) => isObject(v) && typeof v.id === 'string' && typeof v.url === 'string' && typeof v.title === 'string'
const isCommand = (v: unknown) =>
    isObject(v) && typeof v.trigger === 'string' && ['link', 'search', 'action', 'translate'].includes(v.kind as string)
const isSession = (v: unknown) => isObject(v) && typeof v.start === 'number' && typeof v.minutes === 'number'

function validate(data: Record<string, unknown>): string | null {
    const { settings, groups, commands, sessions, word } = data
    if (settings !== undefined && !isObject(settings)) return 'settings'
    if (groups !== undefined) {
        if (!isObject(groups)) return 'groups'
        for (const side of ['left', 'right']) {
            const list = groups[side]
            if (!Array.isArray(list) || list.length > MAX_PER_GROUP || !list.every(isShortcut)) return 'groups'
        }
    }
    if (commands !== undefined && (!Array.isArray(commands) || !commands.every(isCommand))) return 'commands'
    if (sessions !== undefined && (!Array.isArray(sessions) || !sessions.every(isSession))) return 'sessions'
    if (word !== undefined && !isObject(word)) return 'word'
    return null
}

export async function importData(area: StorageArea, json: string): Promise<ImportResult> {
    let parsed: unknown
    try {
        parsed = JSON.parse(json)
    } catch {
        return { ok: false, error: 'Dosya geçerli bir JSON değil.' }
    }
    if (!isObject(parsed) || parsed.app !== APP_ID || !isObject(parsed.data)) {
        return { ok: false, error: 'Bu dosya NewTab yedeği değil.' }
    }
    const invalid = validate(parsed.data)
    if (invalid) return { ok: false, error: `Yedekteki "${invalid}" bölümü bozuk.` }

    for (const key of EXPORTED_KEYS) {
        if (parsed.data[key] !== undefined) await save(area, key, normalize(key, parsed.data[key]))
    }
    return { ok: true }
}
