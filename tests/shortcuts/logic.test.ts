import { FAVICON_TTL, faviconSources, resolveFavicon } from '../../src/shortcuts/favicon'
import {
    addShortcut,
    cellPosition,
    colorFor,
    GroupFullError,
    gridCells,
    letterFor,
    normalizeUrl,
    removeShortcut,
    titleFromUrl,
    updateShortcut,
} from '../../src/shortcuts/logic'
import type { Groups, Shortcut } from '../../src/shared/types'

const site = (id: string, url = `https://${id}.com`): Shortcut => ({ id, title: id, url, icon: { type: 'auto' } })
const many = (n: number) => Array.from({ length: n }, (_, i) => site(`s${i}`))

describe('normalizeUrl', () => {
    test('adds https', () => expect(normalizeUrl('github.com')).toBe('https://github.com/'))
    test('keeps existing scheme', () => expect(normalizeUrl('http://example.org/a')).toBe('http://example.org/a'))
    test('localhost gets http', () => expect(normalizeUrl('localhost:3000')).toBe('http://localhost:3000/'))
    test('ip gets http', () => expect(normalizeUrl('192.168.1.1:8080')).toBe('http://192.168.1.1:8080/'))
    test('trims whitespace', () => expect(normalizeUrl('  github.com ')).toBe('https://github.com/'))
    test('rejects empty', () => expect(normalizeUrl('  ')).toBeNull())
    test('rejects words without a dot', () => expect(normalizeUrl('hello')).toBeNull())
    test('rejects spaces', () => expect(normalizeUrl('git hub.com')).toBeNull())
    test('rejects other protocols', () => expect(normalizeUrl('javascript://alert(1)')).toBeNull())
})

describe('titleFromUrl', () => {
    test('strips www and tld', () => expect(titleFromUrl('https://www.github.com/')).toBe('Github'))
    test('uses registrable name for subdomains', () => expect(titleFromUrl('https://mail.google.com/')).toBe('Google'))
    test('handles generic second-level domains', () => expect(titleFromUrl('https://www.bbc.co.uk/')).toBe('Bbc'))
    test('keeps localhost with port', () => expect(titleFromUrl('http://localhost:3000/')).toBe('localhost:3000'))
})

describe('groups', () => {
    const empty: Groups = { left: [], right: [] }

    test('adds to the chosen side', () => {
        const g = addShortcut(empty, 'right', site('a'))
        expect(g.right.map((s) => s.id)).toEqual(['a'])
        expect(g.left).toEqual([])
    })

    test('refuses the 11th site', () => {
        expect(() => addShortcut({ left: many(10), right: [] }, 'left', site('x'))).toThrow(GroupFullError)
    })

    test('the other side still accepts when one is full', () => {
        expect(addShortcut({ left: many(10), right: [] }, 'right', site('x')).right).toHaveLength(1)
    })

    test('updates and removes by id on either side', () => {
        let g: Groups = { left: [site('a')], right: [site('b')] }
        g = updateShortcut(g, 'b', { title: 'Bee' })
        expect(g.right[0].title).toBe('Bee')
        g = removeShortcut(g, 'a')
        expect(g.left).toEqual([])
    })
})

describe('grid', () => {
    test('empty group shows only the add button', () => expect(gridCells([])).toEqual([{ kind: 'add' }]))

    test('add button follows the last site', () => {
        const cells = gridCells(many(3))
        expect(cells).toHaveLength(4)
        expect(cells[3]).toEqual({ kind: 'add' })
    })

    test('full group hides the add button', () => {
        const cells = gridCells(many(10))
        expect(cells).toHaveLength(10)
        expect(cells.every((c) => c.kind === 'site')).toBe(true)
    })

    test('fills the first column before the second', () => {
        expect(cellPosition(0)).toEqual({ col: 1, row: 1 })
        expect(cellPosition(4)).toEqual({ col: 1, row: 5 })
        expect(cellPosition(5)).toEqual({ col: 2, row: 1 })
        expect(cellPosition(9)).toEqual({ col: 2, row: 5 })
    })
})

describe('letter icons', () => {
    test('uppercases with Turkish rules', () => expect(letterFor('istanbul')).toBe('İ'))
    test('falls back to ?', () => expect(letterFor('  ')).toBe('?'))
    test('color is stable per key', () => expect(colorFor('github.com')).toBe(colorFor('github.com')))
})

describe('resolveFavicon', () => {
    const image = (status: number) =>
        new Response(new Uint8Array([137, 80, 78, 71]), { status, headers: { 'content-type': 'image/png' } })
    const png = () => image(200)
    const notFound = () => image(404)

    test('skips a 404 placeholder and uses the next source', async () => {
        const [ddg, google] = faviconSources('example.com')
        const fetchFn = vi.fn(async (url: string) => (url === ddg ? notFound() : png()))
        const result = await resolveFavicon('example.com', fetchFn, {}, 1000)
        expect(fetchFn).toHaveBeenCalledWith(google)
        expect(result.data).toMatch(/^data:image\/png;base64,/)
        expect(result.cache['example.com'].data).toBe(result.data)
    })

    test('caches a missing icon as null', async () => {
        const result = await resolveFavicon('nope.dev', async () => notFound(), {}, 1000)
        expect(result.data).toBeNull()
        expect(result.cache['nope.dev']).toEqual({ data: null, at: 1000 })
    })

    test('does not cache network failures', async () => {
        const result = await resolveFavicon('offline.dev', async () => Promise.reject(new TypeError('offline')), {}, 1000)
        expect(result.data).toBeNull()
        expect(result.cache).toEqual({})
    })

    test('uses a fresh cache entry without fetching', async () => {
        const fetchFn = vi.fn()
        const cache = { 'a.com': { data: 'data:x', at: 0 } }
        expect((await resolveFavicon('a.com', fetchFn, cache, FAVICON_TTL - 1)).data).toBe('data:x')
        expect(fetchFn).not.toHaveBeenCalled()
    })

    test('refetches an expired entry', async () => {
        const fetchFn = vi.fn(async () => png())
        await resolveFavicon('a.com', fetchFn, { 'a.com': { data: null, at: 0 } }, FAVICON_TTL + 1)
        expect(fetchFn).toHaveBeenCalled()
    })
})
