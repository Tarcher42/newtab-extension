import { useEffect, useMemo, useState } from 'preact/hooks'
import { formatCountdown } from '../shared/time'
import type { Phase } from '../shared/types'
import { useStored } from '../storage/useStored'
import { isIdle, isRunning, remaining } from './logic'
import { sendTimer } from './messages'

const PHASE_LABEL: Record<Phase, string> = {
    idle: 'Hazır',
    work: 'Çalışma',
    short: 'Kısa mola',
    long: 'Uzun mola',
}

export function PomodoroWidget() {
    const [timer] = useStored('timer')
    const [settings] = useStored('settings')
    const [sessions] = useStored('sessions')
    const [now, setNow] = useState(() => Date.now())
    const [tagDraft, setTagDraft] = useState(timer.tag)
    const running = isRunning(timer)

    useEffect(() => setTagDraft(timer.tag), [timer.tag])

    useEffect(() => {
        setNow(Date.now())
        if (!running) return
        const id = setInterval(() => setNow(Date.now()), 250)
        return () => clearInterval(id)
    }, [running, timer.endsAt])

    const recentTags = useMemo(() => {
        const seen = new Set<string>()
        for (let i = sessions.length - 1; i >= 0 && seen.size < 8; i--) seen.add(sessions[i].tag)
        return [...seen]
    }, [sessions])

    const idle = isIdle(timer)
    const ms = idle ? settings.pomodoro.workMin * 60_000 : remaining(timer, now)
    const cycle = settings.pomodoro.roundsUntilLong
    const roundInCycle = ((timer.round - 1) % cycle) + 1
    const startLabel = running ? 'Duraklat' : idle || timer.startedAt === null ? 'Başlat' : 'Devam'

    function commitTag() {
        if (tagDraft.trim() !== timer.tag) void sendTimer({ type: 'timer', action: 'tag', tag: tagDraft })
    }

    return (
        <section class={`widget glass pomodoro phase-${timer.phase}`} aria-label="Pomodoro">
            <h2 class="widget-title">Pomodoro</h2>
            <div class="pomodoro-phase">
                <span>{PHASE_LABEL[timer.phase]}</span>
                {!idle && (
                    <span class="pomodoro-round">
                        Tur {roundInCycle}/{cycle}
                    </span>
                )}
            </div>
            <div class="pomodoro-time" role="timer" aria-live="off">
                {formatCountdown(ms)}
            </div>
            <label class="pomodoro-tag">
                <span>Etiket</span>
                <input
                    class="input"
                    list="pomodoro-tags"
                    value={tagDraft}
                    maxLength={40}
                    onInput={(e) => setTagDraft(e.currentTarget.value)}
                    onBlur={commitTag}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
                <datalist id="pomodoro-tags">
                    {recentTags.map((tag) => (
                        <option key={tag} value={tag} />
                    ))}
                </datalist>
            </label>
            <div class="pomodoro-actions">
                <button type="button" class="btn btn-primary" onClick={() => void sendTimer({ type: 'timer', action: 'toggle' })}>
                    {startLabel}
                </button>
                <button type="button" class="btn" disabled={idle} onClick={() => void sendTimer({ type: 'timer', action: 'skip' })}>
                    Atla
                </button>
                <button type="button" class="btn" disabled={idle} onClick={() => void sendTimer({ type: 'timer', action: 'reset' })}>
                    Sıfırla
                </button>
            </div>
        </section>
    )
}
