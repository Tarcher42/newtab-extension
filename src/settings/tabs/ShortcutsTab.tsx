import { useCallback, useState } from 'preact/hooks'
import { TrashIcon } from '../../newtab/icons'
import type { Shortcut, Side } from '../../shared/types'
import { addShortcut, MAX_PER_GROUP, removeShortcut, updateShortcut } from '../../shortcuts/logic'
import { ShortcutEditor } from '../../shortcuts/ShortcutEditor'
import { useStored } from '../../storage/useStored'

type Editing = { side: Side; initial?: Shortcut }

export function ShortcutsTab() {
    const [groups, setGroups] = useStored('groups')
    const [editing, setEditing] = useState<Editing | null>(null)
    const close = useCallback(() => setEditing(null), [])

    function save(shortcut: Shortcut) {
        if (!editing) return
        setGroups(editing.initial ? updateShortcut(groups, shortcut.id, shortcut) : addShortcut(groups, editing.side, shortcut))
        setEditing(null)
    }

    return (
        <>
            {(['left', 'right'] as const).map((side) => {
                const list = groups[side]
                return (
                    <section class="settings-section" key={side}>
                        <div class="row row-between">
                            <h3>
                                {side === 'left' ? 'Sol grup' : 'Sağ grup'} · {list.length}/{MAX_PER_GROUP}
                            </h3>
                            <button type="button" class="btn" disabled={list.length >= MAX_PER_GROUP} onClick={() => setEditing({ side })}>
                                Ekle
                            </button>
                        </div>
                        {list.length === 0 ? (
                            <p class="hint">Henüz site yok.</p>
                        ) : (
                            <ul class="item-list">
                                {list.map((s) => (
                                    <li class="item" key={s.id}>
                                        <button type="button" class="item-main btn-reset" onClick={() => setEditing({ side, initial: s })}>
                                            {s.title} <span class="item-sub">{s.url}</span>
                                        </button>
                                        <button
                                            type="button"
                                            class="icon-btn"
                                            aria-label={`${s.title} sil`}
                                            onClick={() => setGroups(removeShortcut(groups, s.id))}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )
            })}
            <p class="hint">Sayfadaki bir siteye sağ tıklayarak da düzenleyebilir ya da silebilirsin.</p>
            {editing && <ShortcutEditor initial={editing.initial} onSave={save} onClose={close} />}
        </>
    )
}
