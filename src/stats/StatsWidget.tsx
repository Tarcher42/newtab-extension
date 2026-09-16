import { useEffect, useMemo, useState } from 'preact/hooks'
import { dayKey, formatDuration } from '../shared/time'
import { useStored } from '../storage/useStored'
import { dailyTotals, heatmap, streak, tooltip } from './logic'

/** Re-renders when the day changes so the grid and streak roll over at midnight. */
function useToday(): Date {
    const [today, setToday] = useState(() => new Date())
    useEffect(() => {
        const id = setInterval(() => {
            const now = new Date()
            setToday((prev) => (dayKey(prev) === dayKey(now) ? prev : now))
        }, 60_000)
        return () => clearInterval(id)
    }, [])
    return today
}

export function StatsWidget() {
    const [sessions] = useStored('sessions')
    const today = useToday()
    // A clicked day stays shown so the reading does not vanish when the pointer moves away.
    const [hovered, setHovered] = useState<string | null>(null)
    const [pinned, setPinned] = useState<string | null>(null)

    const totals = useMemo(() => dailyTotals(sessions), [sessions])
    const grid = useMemo(() => heatmap(totals, today), [totals, today])
    const days = streak(totals, today)
    const todayMinutes = totals.get(dayKey(today))?.minutes ?? 0

    return (
        <section class="widget glass stats" aria-label="Çalışma istatistiği">
            <h2 class="widget-title">Çalışma</h2>
            <div class="heatmap" onMouseLeave={() => setHovered(pinned)}>
                {grid.map((week, w) => (
                    <div class="heatmap-week" key={w}>
                        {week.map((cell, d) =>
                            cell ? (
                                <span
                                    key={cell.date}
                                    class={`heatmap-cell lvl-${cell.level}${cell.date === dayKey(today) ? ' is-today' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={tooltip(cell.date, totals.get(cell.date))}
                                    onMouseEnter={() => !pinned && setHovered(cell.date)}
                                    onClick={() => {
                                        setPinned(pinned === cell.date ? null : cell.date)
                                        setHovered(cell.date)
                                    }}
                                />
                            ) : (
                                <span key={`empty-${d}`} class="heatmap-cell is-future" />
                            ),
                        )}
                    </div>
                ))}
            </div>
            <p class="stats-tooltip">{hovered ? tooltip(hovered, totals.get(hovered)) : 'Bir güne gel: o gün ne kadar çalıştığın burada yazar.'}</p>
            <div class="stats-legend">
                <span>az</span>
                {[0, 1, 2, 3, 4].map((l) => (
                    <span key={l} class={`heatmap-cell lvl-${l}`} />
                ))}
                <span>çok</span>
                <span class="stats-legend-today">
                    <span class="heatmap-cell is-today" /> bugün
                </span>
            </div>
            <div class="stats-summary">
                <span class={days > 0 ? 'streak is-active' : 'streak'}>🔥 {days} gün seri</span>
                <span>Bugün {formatDuration(todayMinutes)}</span>
            </div>
        </section>
    )
}
