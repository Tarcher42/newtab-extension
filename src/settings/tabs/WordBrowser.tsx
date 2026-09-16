import { useMemo, useState } from 'preact/hooks'
import type { WordState } from '../../shared/types'
import { addKnown, browseWords, removeKnown, type BrowseFilter, type WordList } from '../../word/logic'

const PAGE = 50
const FILTERS: { id: BrowseFilter; label: string }[] = [
    { id: 'all', label: 'Tümü' },
    { id: 'known', label: 'Bilinenler' },
    { id: 'custom', label: 'Kendi kelimelerim' },
]

type Props = {
    state: WordState
    list: WordList | null
    onChange: (next: WordState) => void
}

export function WordBrowser({ state, list, onChange }: Props) {
    const [filter, setFilter] = useState<BrowseFilter>('all')
    const [query, setQuery] = useState('')
    const [shown, setShown] = useState(PAGE)

    const rows = useMemo(() => browseWords(state, list, filter, query), [state, list, filter, query])
    const visible = rows.slice(0, shown)

    const change = (next: BrowseFilter | null, q?: string) => {
        if (next) setFilter(next)
        if (q !== undefined) setQuery(q)
        setShown(PAGE)
    }

    return (
        <div class="settings-section">
            <div class="segmented">
                {FILTERS.map((f) => (
                    <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => change(f.id)}>
                        {f.label}
                    </button>
                ))}
            </div>
            <input
                class="input"
                type="search"
                value={query}
                placeholder="Kelime ya da anlam ara"
                aria-label="Kelime ara"
                onInput={(e) => change(null, e.currentTarget.value)}
            />
            {!list && <p class="hint">Kelime listesi yüklenemedi; burada yalnızca kendi kelimelerin görünür.</p>}
            {rows.length === 0 ? (
                <p class="hint">Eşleşen kelime yok.</p>
            ) : (
                <>
                    <ul class="item-list">
                        {visible.map((row) => (
                            <li class="item" key={row.word}>
                                <span class="item-main">
                                    <strong lang="en">{row.word}</strong> <span class="item-sub">{row.meaning}</span>
                                </span>
                                {row.level && <span class="word-level">{row.level}</span>}
                                <button
                                    type="button"
                                    class="btn"
                                    onClick={() => onChange(row.known ? removeKnown(state, row.word) : addKnown(state, row.word, Date.now()))}
                                >
                                    {row.known ? 'Geri al' : 'Biliyorum'}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div class="row row-between">
                        <span class="hint">
                            {visible.length} / {rows.length} kelime
                        </span>
                        {shown < rows.length && (
                            <button type="button" class="btn" onClick={() => setShown(shown + PAGE)}>
                                Daha fazla göster
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
