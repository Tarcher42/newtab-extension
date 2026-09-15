import { useState } from 'preact/hooks'
import type { Shortcut, Side } from '../shared/types'
import { AddIcon } from '../newtab/icons'
import { colorFor, domainOf, gridCells, letterFor } from './logic'
import { useFavicon } from './useFavicon'
import './shortcuts.css'

type Props = {
    side: Side
    shortcuts: Shortcut[]
    onAdd: (side: Side) => void
    onContextMenu: (shortcut: Shortcut, x: number, y: number) => void
}

export function ShortcutGroup({ side, shortcuts, onAdd, onContextMenu }: Props) {
    return (
        <nav class={`group group-${side}`} aria-label={side === 'left' ? 'Sol kısayollar' : 'Sağ kısayollar'}>
            {gridCells(shortcuts).map((cell) =>
                cell.kind === 'site' ? (
                    <ShortcutTile key={cell.shortcut.id} shortcut={cell.shortcut} onContextMenu={onContextMenu} />
                ) : (
                    <button key="add" type="button" class="link link-add" onClick={() => onAdd(side)}>
                        <span class="link-icon link-add-icon">
                            <AddIcon />
                        </span>
                        <span class="link-title">Add New Tab</span>
                    </button>
                ),
            )}
        </nav>
    )
}

function ShortcutTile({ shortcut, onContextMenu }: { shortcut: Shortcut; onContextMenu: Props['onContextMenu'] }) {
    const src = useFavicon(shortcut)
    const [broken, setBroken] = useState<string | null>(null)
    const showImage = src !== null && broken !== src

    return (
        <a
            class="link"
            href={shortcut.url}
            title={shortcut.url}
            onContextMenu={(e) => {
                e.preventDefault()
                onContextMenu(shortcut, e.clientX, e.clientY)
            }}
        >
            <span class="link-icon">
                {showImage ? (
                    <img src={src} alt="" draggable={false} onError={() => setBroken(src)} />
                ) : (
                    <span class="link-letter" style={{ background: colorFor(domainOf(shortcut.url) || shortcut.title) }}>
                        {letterFor(shortcut.title)}
                    </span>
                )}
            </span>
            <span class="link-title">{shortcut.title}</span>
        </a>
    )
}
