import { DEFAULT_COMMANDS, DEFAULT_SETTINGS } from '../../src/shared/defaults'
import { exportData, importData } from '../../src/storage/backup'
import { deleteImage, getImage, putImage } from '../../src/storage/images'
import { load, save, update } from '../../src/storage/store'
import { memoryArea } from '../fakes/memoryArea'

describe('store', () => {
    test('returns defaults when empty', async () => {
        expect(await load(memoryArea(), 'settings')).toEqual(DEFAULT_SETTINGS)
        expect(await load(memoryArea(), 'groups')).toEqual({ left: [], right: [] })
    })

    test('merges partial settings with defaults', async () => {
        const area = memoryArea({ settings: { clock: { h24: false }, pomodoro: { workMin: 50 } } })
        const settings = await load(area, 'settings')
        expect(settings.clock).toEqual({ h24: false, seconds: false })
        expect(settings.pomodoro.workMin).toBe(50)
        expect(settings.pomodoro.shortMin).toBe(5)
        expect(settings.schemaVersion).toBe(2)
    })

    test('v1 settings with the old Outfit clock default move to JetBrains Mono', async () => {
        const area = memoryArea({ settings: { schemaVersion: 1, fonts: { ui: 'Inter Variable', clock: 'Outfit Variable' } } })
        const settings = await load(area, 'settings')
        expect(settings.fonts).toEqual({ ui: 'Inter Variable', clock: 'JetBrains Mono Variable' })
    })

    test('a custom clock font survives the migration', async () => {
        const area = memoryArea({ settings: { schemaVersion: 1, fonts: { clock: 'Fira Code' } } })
        expect((await load(area, 'settings')).fonts.clock).toBe('Fira Code')
    })

    test('ignores fields with the wrong type', async () => {
        const area = memoryArea({ settings: { shadowStrength: 'loud', widgetOrder: 'nope' } })
        const settings = await load(area, 'settings')
        expect(settings.shadowStrength).toBe(DEFAULT_SETTINGS.shadowStrength)
        expect(settings.widgetOrder).toEqual(DEFAULT_SETTINGS.widgetOrder)
    })

    test('corrupt values fall back to defaults', async () => {
        const area = memoryArea({ settings: 42, groups: 'x', commands: {}, sessions: null })
        expect(await load(area, 'settings')).toEqual(DEFAULT_SETTINGS)
        expect(await load(area, 'groups')).toEqual({ left: [], right: [] })
        expect(await load(area, 'commands')).toEqual(DEFAULT_COMMANDS)
        expect(await load(area, 'sessions')).toEqual([])
    })

    test('restores built-in actions that are missing', async () => {
        const area = memoryArea({ commands: [{ id: 'x', trigger: 'p', kind: 'action', actionId: 'pomodoro.toggle', uses: 3 }] })
        const commands = await load(area, 'commands')
        expect(commands.filter((c) => c.actionId === 'pomodoro.toggle')).toHaveLength(1)
        expect(commands.find((c) => c.actionId === 'word.next')).toBeTruthy()
    })

    test('save and update round-trip and notify listeners', async () => {
        const area = memoryArea()
        const seen: unknown[] = []
        area.onChanged((c) => seen.push(c))
        await save(area, 'sessions', [{ start: 1, minutes: 25, tag: 'Genel' }])
        await update(area, 'sessions', (s) => [...s, { start: 2, minutes: 5, tag: 'React' }])
        expect(await load(area, 'sessions')).toHaveLength(2)
        expect(seen).toHaveLength(2)
    })
})

describe('backup', () => {
    test('export then import restores data and drops dictionary cache', async () => {
        const source = memoryArea({
            groups: { left: [{ id: '1', title: 'GitHub', url: 'https://github.com', icon: { type: 'auto' } }], right: [] },
            word: { known: ['apple'], custom: [], today: null, cache: { apple: { definition: 'fruit' } } },
        })
        const json = await exportData(source)
        const target = memoryArea()
        expect(await importData(target, json)).toEqual({ ok: true })
        expect((await load(target, 'groups')).left[0].title).toBe('GitHub')
        const word = await load(target, 'word')
        expect(word.known).toEqual(['apple'])
        expect(word.cache).toEqual({})
    })

    const rejects = async (json: string) => {
        const area = memoryArea({ sessions: [{ start: 1, minutes: 1, tag: 'Genel' }] })
        const result = await importData(area, json)
        expect(result.ok).toBe(false)
        expect(area.data.sessions).toEqual([{ start: 1, minutes: 1, tag: 'Genel' }])
    }

    test('rejects invalid JSON', () => rejects('{nope'))
    test('rejects files from other apps', () => rejects(JSON.stringify({ app: 'other', data: {} })))
    test('rejects a group with more than 10 sites', () => {
        const site = { id: 'a', title: 'a', url: 'https://a.com', icon: { type: 'auto' } }
        return rejects(JSON.stringify({ app: 'newtab', data: { sessions: [], groups: { left: Array(11).fill(site), right: [] } } }))
    })
    test('rejects malformed sessions', () => rejects(JSON.stringify({ app: 'newtab', data: { sessions: [{ start: 'x' }] } })))
})

describe('images', () => {
    test('put, get and delete a blob', async () => {
        await putImage('bg', new Blob(['hello'], { type: 'text/plain' }))
        const blob = await getImage('bg')
        expect(blob).not.toBeNull()
        await deleteImage('bg')
        expect(await getImage('bg')).toBeNull()
    })
})
