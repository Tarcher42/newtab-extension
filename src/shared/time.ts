const pad = (n: number) => String(n).padStart(2, '0')

export function formatClock(date: Date, opts: { h24: boolean; seconds: boolean }): string {
    const h = date.getHours()
    const hour = opts.h24 ? pad(h) : String(h % 12 || 12)
    const base = `${hour}:${pad(date.getMinutes())}`
    return opts.seconds ? `${base}:${pad(date.getSeconds())}` : base
}

export function formatDate(date: Date, locale?: string): string {
    const day = date.getDate()
    const month = date.toLocaleDateString(locale, { month: 'long' })
    const weekday = date.toLocaleDateString(locale, { weekday: 'long' })
    return `${day} ${month} ${weekday}`
}

export function dayKey(value: Date | number): string {
    const d = typeof value === 'number' ? new Date(value) : value
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDuration(minutes: number): string {
    const total = Math.round(minutes)
    const h = Math.floor(total / 60)
    const m = total % 60
    if (h === 0) return `${m} dk`
    return m === 0 ? `${h} sa` : `${h} sa ${m} dk`
}

export function formatCountdown(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
    return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`
}
