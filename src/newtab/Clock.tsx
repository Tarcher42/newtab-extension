import { useEffect, useState } from 'preact/hooks'
import { formatClock, formatDate } from '../shared/time'
import type { Settings } from '../shared/types'

export function Clock({ clock }: { clock: Settings['clock'] }) {
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>
        const tick = () => {
            const current = new Date()
            setNow(current)
            const step = clock.seconds ? 1000 - current.getMilliseconds() : 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds())
            timer = setTimeout(tick, step + 5)
        }
        tick()
        return () => clearTimeout(timer)
    }, [clock.seconds])

    return (
        <div class="clock">
            <time class="clock-time" dateTime={now.toISOString()}>
                {formatClock(now, clock)}
            </time>
            <div class="clock-date">{formatDate(now, navigator.language)}</div>
        </div>
    )
}
