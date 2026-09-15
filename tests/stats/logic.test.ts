import { dailyTotals, heatmap, level, streak, tooltip } from '../../src/stats/logic'
import type { Session } from '../../src/shared/types'

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime()
const session = (start: number, minutes: number, tag = 'Genel'): Session => ({ start, minutes, tag })

test('dailyTotals groups by local day and tag', () => {
    const totals = dailyTotals([
        session(at(2026, 9, 14, 9), 60, 'Matematik'),
        session(at(2026, 9, 14, 23), 40, 'React'),
        session(at(2026, 9, 15, 0), 25, 'React'),
    ])
    expect(totals.get('2026-09-14')).toEqual({ minutes: 100, byTag: { Matematik: 60, React: 40 } })
    expect(totals.get('2026-09-15')?.minutes).toBe(25)
})

test.each([
    [0, 0],
    [29, 1],
    [30, 2],
    [59, 2],
    [60, 3],
    [119, 3],
    [120, 4],
])('level(%i) = %i', (minutes, expected) => expect(level(minutes)).toBe(expected))

describe('heatmap', () => {
    const today = new Date(2026, 8, 16, 15) // Wednesday
    const grid = heatmap(dailyTotals([session(at(2026, 9, 14), 45)]), today)

    test('is 18 weeks of 7 days', () => {
        expect(grid).toHaveLength(18)
        expect(grid.every((w) => w.length === 7)).toBe(true)
    })

    test('columns start on Monday and the last one holds today', () => {
        const last = grid[17]
        expect(last[0]?.date).toBe('2026-09-14')
        expect(last[2]?.date).toBe('2026-09-16')
        expect(last.slice(3)).toEqual([null, null, null, null])
    })

    test('first column is 17 weeks before this Monday', () => {
        expect(grid[0][0]?.date).toBe('2026-05-18')
    })

    test('cells carry minutes and level', () => {
        expect(grid[17][0]).toEqual({ date: '2026-09-14', minutes: 45, level: 2 })
    })

    test('a Sunday today fills the whole last column', () => {
        const sunday = heatmap(new Map(), new Date(2026, 8, 20))
        expect(sunday[17].every((c) => c !== null)).toBe(true)
    })
})

describe('streak', () => {
    const today = new Date(2026, 8, 16, 12)

    test('counts consecutive days including today', () => {
        const totals = dailyTotals([session(at(2026, 9, 14), 10), session(at(2026, 9, 15), 10), session(at(2026, 9, 16), 10)])
        expect(streak(totals, today)).toBe(3)
    })

    test('an empty today keeps the streak from yesterday', () => {
        const totals = dailyTotals([session(at(2026, 9, 14), 10), session(at(2026, 9, 15), 10)])
        expect(streak(totals, today)).toBe(2)
    })

    test('a gap breaks it', () => {
        const totals = dailyTotals([session(at(2026, 9, 13), 10), session(at(2026, 9, 15), 10)])
        expect(streak(totals, today)).toBe(1)
    })

    test('no sessions is zero', () => expect(streak(new Map(), today)).toBe(0))
})

describe('tooltip', () => {
    test('lists tags by time', () => {
        expect(tooltip('2026-09-14', { minutes: 100, byTag: { React: 40, Matematik: 60 } })).toBe(
            '14 Eylül — 1 sa 40 dk · Matematik 1 sa, React 40 dk',
        )
    })

    test('empty day', () => expect(tooltip('2026-09-14', undefined)).toBe('14 Eylül — çalışma yok'))
})
