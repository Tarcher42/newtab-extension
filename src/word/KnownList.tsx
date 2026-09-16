import { useState } from 'preact/hooks'
import { BackIcon, TrashIcon } from '../newtab/icons'
import type { KnownEntry } from './logic'
import { WordDetail } from './WordDetail'

const dateLabel = (at: number | null) =>
    at === null ? '—' : new Date(at).toLocaleDateString(navigator.language, { day: 'numeric', month: 'short' })

type Props = { entries: KnownEntry[]; onRemove: (word: string) => void }

export function KnownList({ entries, onRemove }: Props) {
    const [selected, setSelected] = useState<string | null>(null)
    const current = entries.find((e) => e.word === selected)

    if (current) {
        return (
            <>
                <button type="button" class="word-back" onClick={() => setSelected(null)}>
                    <BackIcon /> Liste
                </button>
                <WordDetail word={current.word} meaning={current.meaning || 'Anlamı listede yok'} />
                <div class="known-detail-foot">
                    <span class="item-sub">
                        {current.level ? `${current.level} · ` : ''}
                        {dateLabel(current.at)}
                    </span>
                    <button
                        type="button"
                        class="btn btn-danger"
                        onClick={() => {
                            onRemove(current.word)
                            setSelected(null)
                        }}
                    >
                        <TrashIcon /> Listeden çıkar
                    </button>
                </div>
            </>
        )
    }

    if (entries.length === 0) {
        return <p class="word-empty-hint">Henüz "Biliyorum" dediğin kelime yok. Öğrendiklerin burada birikecek.</p>
    }

    return (
        <>
            <div class="known-count">{entries.length} kelime</div>
            <ul class="known-list">
                {entries.map((entry) => (
                    <li class="known-item" key={entry.word}>
                        <button type="button" class="known-row" onClick={() => setSelected(entry.word)}>
                            <span class="known-word" lang="en">
                                {entry.word}
                            </span>
                            <span class="known-meaning">{entry.meaning}</span>
                            <span class="known-date">{dateLabel(entry.at)}</span>
                        </button>
                        <button
                            type="button"
                            class="icon-button known-remove"
                            aria-label={`${entry.word} kelimesini listeden çıkar`}
                            onClick={() => onRemove(entry.word)}
                        >
                            <TrashIcon />
                        </button>
                    </li>
                ))}
            </ul>
        </>
    )
}
