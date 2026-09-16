import { useState } from 'preact/hooks'
import type { KnownEntry } from './logic'

const dateLabel = (at: number | null) =>
    at === null ? '—' : new Date(at).toLocaleDateString(navigator.language, { day: 'numeric', month: 'short' })

export function KnownList({ entries, onRestore }: { entries: KnownEntry[]; onRestore: (word: string) => void }) {
    const [open, setOpen] = useState<string | null>(null)

    if (entries.length === 0) {
        return <p class="word-empty-hint">Henüz "Biliyorum" dediğin kelime yok. Öğrendiklerin burada birikecek.</p>
    }

    return (
        <>
            <div class="known-count">{entries.length} kelime</div>
            <ul class="known-list">
                {entries.map((entry) => (
                    <li key={entry.word}>
                        <button type="button" class="known-row" onClick={() => setOpen(open === entry.word ? null : entry.word)}>
                            <span class="known-word" lang="en">
                                {entry.word}
                            </span>
                            <span class="known-meaning">{entry.meaning}</span>
                            <span class="known-date">{dateLabel(entry.at)}</span>
                        </button>
                        {open === entry.word && (
                            <button type="button" class="btn known-restore" onClick={() => onRestore(entry.word)}>
                                Geri al
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </>
    )
}
