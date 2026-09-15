import type { Groups, Shortcut, Side } from '../shared/types'

export const MAX_PER_GROUP = 10
export const ROWS = 5

export class GroupFullError extends Error {
    constructor(side: Side) {
        super(`Group "${side}" already has ${MAX_PER_GROUP} shortcuts`)
    }
}

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\d+\.\d+\.\d+\.\d+)(:\d+)?(\/|$)/i

export function normalizeUrl(input: string): string | null {
    const trimmed = input.trim()
    if (!trimmed || /\s/.test(trimmed)) return null
    const withScheme = SCHEME.test(trimmed) ? trimmed : `${LOCAL_HOST.test(trimmed) ? 'http' : 'https'}://${trimmed}`

    let url: URL
    try {
        url = new URL(withScheme)
    } catch {
        return null
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const host = url.hostname
    if (host !== 'localhost' && !host.includes('.')) return null
    return url.href
}

const GENERIC_SLD = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'gen', 'bel', 'k12'])

export function titleFromUrl(url: string): string {
    const { hostname, host } = new URL(url)
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return host
    const parts = hostname.replace(/^www\./, '').split('.')
    let name = parts.length >= 2 ? parts[parts.length - 2] : parts[0]
    if (parts.length >= 3 && GENERIC_SLD.has(name)) name = parts[parts.length - 3]
    return name.charAt(0).toLocaleUpperCase('tr-TR') + name.slice(1)
}

export function domainOf(url: string): string {
    try {
        return new URL(url).hostname
    } catch {
        return ''
    }
}

export function addShortcut(groups: Groups, side: Side, shortcut: Shortcut): Groups {
    if (groups[side].length >= MAX_PER_GROUP) throw new GroupFullError(side)
    return { ...groups, [side]: [...groups[side], shortcut] }
}

export function updateShortcut(groups: Groups, id: string, patch: Partial<Omit<Shortcut, 'id'>>): Groups {
    const apply = (list: Shortcut[]) => list.map((s) => (s.id === id ? { ...s, ...patch } : s))
    return { left: apply(groups.left), right: apply(groups.right) }
}

export function removeShortcut(groups: Groups, id: string): Groups {
    return { left: groups.left.filter((s) => s.id !== id), right: groups.right.filter((s) => s.id !== id) }
}

export type Cell = { kind: 'site'; shortcut: Shortcut } | { kind: 'add' }

/** Sites in order, followed by the add button while the group has room. */
export function gridCells(list: Shortcut[]): Cell[] {
    const cells: Cell[] = list.slice(0, MAX_PER_GROUP).map((shortcut) => ({ kind: 'site', shortcut }))
    if (list.length < MAX_PER_GROUP) cells.push({ kind: 'add' })
    return cells
}

/** Column-first fill: the first column takes rows 1-5 before the second column starts. */
export function cellPosition(index: number): { col: 1 | 2; row: number } {
    return { col: index < ROWS ? 1 : 2, row: (index % ROWS) + 1 }
}

export function letterFor(title: string): string {
    const first = [...title.trim()][0]
    return first ? first.toLocaleUpperCase('tr-TR') : '?'
}

export function colorFor(key: string): string {
    let hash = 0
    for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
    return `hsl(${hash % 360} 55% 45%)`
}
