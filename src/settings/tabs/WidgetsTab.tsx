import { useEffect, useState } from 'preact/hooks'
import { TrashIcon } from '../../newtab/icons'
import type { Level, Settings, WidgetId, Word } from '../../shared/types'
import { useStored } from '../../storage/useStored'
import { loadWordList } from '../../word/list'
import type { WordList } from '../../word/logic'
import { WordBrowser } from './WordBrowser'

const WIDGET_LABELS: Record<WidgetId, string> = { word: 'Günün kelimesi', pomodoro: 'Pomodoro', stats: 'Çalışma istatistiği' }
const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1']

export function WidgetsTab() {
    const [settings, setSettings] = useStored('settings')
    const [word, setWord] = useStored('word')
    const [list, setList] = useState<WordList | null>(null)

    useEffect(() => {
        loadWordList()
            .then(setList)
            .catch(() => setList(null))
    }, [])

    const set = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch })
    const p = settings.pomodoro
    const setPomodoro = (patch: Partial<Settings['pomodoro']>) => set({ pomodoro: { ...p, ...patch } })

    function move(index: number, delta: number) {
        const order = [...settings.widgetOrder]
        const [item] = order.splice(index, 1)
        order.splice(index + delta, 0, item)
        set({ widgetOrder: order })
    }

    return (
        <>
            <section class="settings-section">
                <h3>Sıra ve görünürlük</h3>
                <ul class="item-list">
                    {settings.widgetOrder.map((id, i) => (
                        <li class="item" key={id}>
                            <input
                                type="checkbox"
                                checked={settings.widgetsEnabled[id]}
                                aria-label={`${WIDGET_LABELS[id]} göster`}
                                onChange={(e) => set({ widgetsEnabled: { ...settings.widgetsEnabled, [id]: e.currentTarget.checked } })}
                            />
                            <span class="item-main">{WIDGET_LABELS[id]}</span>
                            <button type="button" class="icon-btn" disabled={i === 0} aria-label="Yukarı taşı" onClick={() => move(i, -1)}>
                                ↑
                            </button>
                            <button
                                type="button"
                                class="icon-btn"
                                disabled={i === settings.widgetOrder.length - 1}
                                aria-label="Aşağı taşı"
                                onClick={() => move(i, 1)}
                            >
                                ↓
                            </button>
                        </li>
                    ))}
                </ul>
                <p class="hint">Sıra soldan sağa: listenin ilk elemanı en solda durur.</p>
            </section>

            <section class="settings-section">
                <h3>Pomodoro</h3>
                <NumberField label="Çalışma (dk)" value={p.workMin} min={1} max={120} onChange={(workMin) => setPomodoro({ workMin })} />
                <NumberField label="Kısa mola (dk)" value={p.shortMin} min={1} max={60} onChange={(shortMin) => setPomodoro({ shortMin })} />
                <NumberField label="Uzun mola (dk)" value={p.longMin} min={1} max={90} onChange={(longMin) => setPomodoro({ longMin })} />
                <NumberField
                    label="Uzun mola kaç turda bir"
                    value={p.roundsUntilLong}
                    min={2}
                    max={10}
                    onChange={(roundsUntilLong) => setPomodoro({ roundsUntilLong })}
                />
                <label class="toggle">
                    Süre bitince ses çal
                    <input type="checkbox" checked={p.sound} onChange={(e) => setPomodoro({ sound: e.currentTarget.checked })} />
                </label>
                <label class="toggle">
                    Sonraki fazı otomatik başlat
                    <input type="checkbox" checked={p.autoStart} onChange={(e) => setPomodoro({ autoStart: e.currentTarget.checked })} />
                </label>
                <p class="hint">Süre değişiklikleri bir sonraki fazdan itibaren geçerli olur.</p>
            </section>

            <section class="settings-section">
                <h3>Günün kelimesi</h3>
                <label class="field">
                    Seviye
                    <select class="input" value={settings.wordLevel} onChange={(e) => set({ wordLevel: e.currentTarget.value as Level })}>
                        {LEVELS.map((l) => (
                            <option key={l} value={l}>
                                {l}
                            </option>
                        ))}
                    </select>
                </label>
                <CustomWordForm
                    onAdd={(w) => setWord({ ...word, custom: [...word.custom.filter((c) => c.word.toLowerCase() !== w.word.toLowerCase()), w] })}
                />
                {word.custom.length > 0 && (
                    <ul class="item-list">
                        {word.custom.map((w) => (
                            <li class="item" key={w.word}>
                                <span class="item-main">
                                    {w.word} <span class="item-sub">{w.meaning} · {w.level}</span>
                                </span>
                                <button
                                    type="button"
                                    class="icon-btn"
                                    aria-label={`${w.word} sil`}
                                    onClick={() => setWord({ ...word, custom: word.custom.filter((c) => c.word !== w.word) })}
                                >
                                    <TrashIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <div class="row row-between">
                    <span class="hint">Bilinen kelime: {word.known.length}</span>
                    <button
                        type="button"
                        class="btn"
                        disabled={word.known.length === 0}
                        onClick={() => window.confirm('Bilinen kelimeler listesi sıfırlansın mı?') && setWord({ ...word, known: [] })}
                    >
                        Bilinenleri sıfırla
                    </button>
                </div>
            </section>

            <section class="settings-section">
                <h3>Kelime listesi</h3>
                <WordBrowser state={word} list={list} onChange={setWord} />
            </section>
        </>
    )
}

type NumberFieldProps = { label: string; value: number; min: number; max: number; onChange: (n: number) => void }

function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
    return (
        <label class="toggle">
            {label}
            <input
                class="input"
                style={{ width: '5.5rem' }}
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(e) => {
                    const n = Math.round(Number(e.currentTarget.value))
                    const clamped = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : value
                    e.currentTarget.value = String(clamped)
                    onChange(clamped)
                }}
            />
        </label>
    )
}

function CustomWordForm({ onAdd }: { onAdd: (w: Word) => void }) {
    const [text, setText] = useState('')
    const [meaning, setMeaning] = useState('')
    const [level, setLevel] = useState<Level>('B1')

    function submit(e: Event) {
        e.preventDefault()
        if (!text.trim() || !meaning.trim()) return
        onAdd({ word: text.trim(), meaning: meaning.trim(), level })
        setText('')
        setMeaning('')
    }

    return (
        <form class="field" onSubmit={submit}>
            Kendi kelimeni ekle
            <div class="row">
                <input class="input grow" value={text} placeholder="Kelime" aria-label="Kelime" onInput={(e) => setText(e.currentTarget.value)} />
                <input class="input grow" value={meaning} placeholder="Anlamı" aria-label="Anlamı" onInput={(e) => setMeaning(e.currentTarget.value)} />
                <select class="input" style={{ width: '4.5rem' }} value={level} aria-label="Seviye" onChange={(e) => setLevel(e.currentTarget.value as Level)}>
                    {LEVELS.map((l) => (
                        <option key={l} value={l}>
                            {l}
                        </option>
                    ))}
                </select>
                <button type="submit" class="btn">
                    Ekle
                </button>
            </div>
        </form>
    )
}
