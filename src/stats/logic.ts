import { dayKey, formatDuration } from '../shared/time'
import type { Session } from '../shared/types'

export const HEATMAP_WEEKS = 18

export type DayTotal = { minutes: number; byTag: Record<string, number> }
export type HeatCell = { date: string; minutes: number; level: number }

export function dailyTotals(sessions: Session[]): Map<string, DayTotal> {
    const totals = new Map<string, DayTotal>()
    for (const s of sessions) {
        const key = dayKey(s.start)
        const day = totals.get(key) ?? { minutes: 0, byTag: {} }
        day.minutes += s.minutes
        day.byTag[s.tag] = (day.byTag[s.tag] ?? 0) + s.minutes
        totals.set(key, day)
    }
    return totals
}

export function level(minutes: number): number {
    if (minutes <= 0) return 0
    if (minutes < 30) return 1
    if (minutes < 60) return 2
    if (minutes < 120) return 3
    return 4
}

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

/** Columns are weeks (Monday first); the last column holds today, later days are null. */
export function heatmap(totals: Map<string, DayTotal>, today: Date, weeks = HEATMAP_WEEKS): (HeatCell | null)[][] {
    const mondayOffset = (today.getDay() + 6) % 7
    const first = addDays(today, -mondayOffset - (weeks - 1) * 7)
    const todayKey = dayKey(today)
    let passedToday = false

    return Array.from({ length: weeks }, (_, w) =>
        Array.from({ length: 7 }, (_, d) => {
            if (passedToday) return null
            const date = dayKey(addDays(first, w * 7 + d))
            if (date === todayKey) passedToday = true
            const minutes = totals.get(date)?.minutes ?? 0
            return { date, minutes, level: level(minutes) }
        }),
    )
}

/** Consecutive days with study. An empty today does not break the streak yet. */
export function streak(totals: Map<string, DayTotal>, today: Date): number {
    const studied = (d: Date) => (totals.get(dayKey(d))?.minutes ?? 0) > 0
    let day = studied(today) ? today : addDays(today, -1)
    let count = 0
    while (studied(day)) {
        count++
        day = addDays(day, -1)
    }
    return count
}

export function tooltip(date: string, total: DayTotal | undefined, locale = 'tr-TR'): string {
    const [y, m, d] = date.split('-').map(Number)
    const label = new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'long' })
    if (!total || total.minutes <= 0) return `${label} — çalışma yok`
    const tags = Object.entries(total.byTag)
        .sort((a, b) => b[1] - a[1])
        .map(([tag, min]) => `${tag} ${formatDuration(min)}`)
        .join(', ')
    return `${label} — ${formatDuration(total.minutes)} · ${tags}`
}
