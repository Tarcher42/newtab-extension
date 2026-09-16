import { useState } from 'preact/hooks'
import { TrashIcon } from '../../newtab/icons'
import { ACTION_LABELS, describeCommand } from '../../palette/actions'
import { validateTrigger, type TriggerCheck } from '../../palette/logic'
import { TRANSLATE_TEMPLATE } from '../../shared/defaults'
import { newId } from '../../shared/id'
import type { Command } from '../../shared/types'
import { normalizeUrl } from '../../shortcuts/logic'
import { useStored } from '../../storage/useStored'

const TRIGGER_ERRORS: Record<Exclude<TriggerCheck, 'ok'>, string> = {
    empty: 'Tetikleyici boş olamaz.',
    spaces: 'Tetikleyicide boşluk olamaz.',
    duplicate: 'Bu tetikleyici zaten kullanılıyor.',
}

export function CommandsTab() {
    const [commands, setCommands] = useStored('commands')
    const [editing, setEditing] = useState<Command | 'new' | null>(null)
    const actions = commands.filter((c) => c.kind === 'action')
    const translate = commands.find((c) => c.kind === 'translate')
    const custom = commands
        .filter((c) => c.kind === 'link' || c.kind === 'search')
        .sort((a, b) => a.trigger.localeCompare(b.trigger))

    const replace = (next: Command) => setCommands(commands.map((c) => (c.id === next.id ? next : c)))

    return (
        <>
            <section class="settings-section">
                <div class="row row-between">
                    <h3>Link ve arama komutları</h3>
                    <button type="button" class="btn" onClick={() => setEditing('new')}>
                        Yeni komut
                    </button>
                </div>
                {editing === 'new' && (
                    <CommandForm
                        commands={commands}
                        onSave={(c) => {
                            setCommands([...commands, c])
                            setEditing(null)
                        }}
                        onCancel={() => setEditing(null)}
                    />
                )}
                <ul class="item-list">
                    {custom.map((c) =>
                        editing !== 'new' && editing?.id === c.id ? (
                            <li key={c.id}>
                                <CommandForm
                                    initial={c}
                                    commands={commands}
                                    onSave={(next) => {
                                        replace(next)
                                        setEditing(null)
                                    }}
                                    onCancel={() => setEditing(null)}
                                />
                            </li>
                        ) : (
                            <li class="item" key={c.id}>
                                <button type="button" class="item-main btn-reset" onClick={() => setEditing(c)}>
                                    <strong>{c.trigger}</strong> <span class="item-sub">{describeCommand(c)}</span>
                                </button>
                                <button
                                    type="button"
                                    class="icon-btn"
                                    aria-label={`${c.trigger} sil`}
                                    onClick={() => setCommands(commands.filter((x) => x.id !== c.id))}
                                >
                                    <TrashIcon />
                                </button>
                            </li>
                        ),
                    )}
                </ul>
                <p class="hint">
                    Arama komutlarında aranan metnin geleceği yere <code>{'{q}'}</code> yaz. Örnek: https://www.google.com/search?q={'{q}'}
                </p>
            </section>

            {translate && <TranslateSection command={translate} commands={commands} onSave={replace} />}

            <section class="settings-section">
                <h3>Hazır eylemler</h3>
                <p class="hint">Eylemler silinemez, sadece tetikleyici kelimesi değiştirilebilir.</p>
                <ul class="item-list">
                    {actions.map((c) => (
                        <ActionRow key={c.id} command={c} commands={commands} onSave={replace} />
                    ))}
                </ul>
            </section>
        </>
    )
}

function ActionRow({ command, commands, onSave }: { command: Command; commands: Command[]; onSave: (c: Command) => void }) {
    const [draft, setDraft] = useState(command.trigger)
    const [error, setError] = useState<string | null>(null)

    function commit() {
        if (draft === command.trigger) return setError(null)
        const check = validateTrigger(commands, draft, command.id)
        if (check !== 'ok') return setError(TRIGGER_ERRORS[check])
        setError(null)
        onSave({ ...command, trigger: draft.trim() })
    }

    return (
        <li class="item" style={{ flexWrap: 'wrap' }}>
            <input
                class="input"
                style={{ width: '7.5rem' }}
                value={draft}
                aria-label={`${ACTION_LABELS[command.actionId!]} tetikleyicisi`}
                onInput={(e) => setDraft(e.currentTarget.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === 'Enter' && commit()}
            />
            <span class="item-main item-sub">{ACTION_LABELS[command.actionId!]}</span>
            {error && (
                <span class="error" role="alert" style={{ flexBasis: '100%' }}>
                    {error}
                </span>
            )}
        </li>
    )
}

type FormProps = { initial?: Command; commands: Command[]; onSave: (c: Command) => void; onCancel: () => void }

function CommandForm({ initial, commands, onSave, onCancel }: FormProps) {
    const [kind, setKind] = useState<'link' | 'search'>(initial?.kind === 'search' ? 'search' : 'link')
    const [trigger, setTrigger] = useState(initial?.trigger ?? '')
    const [target, setTarget] = useState(initial?.url ?? initial?.template ?? '')
    const [error, setError] = useState<string | null>(null)

    function submit(e: Event) {
        e.preventDefault()
        const check = validateTrigger(commands, trigger, initial?.id)
        if (check !== 'ok') return setError(TRIGGER_ERRORS[check])

        const base = { id: initial?.id ?? newId(), trigger: trigger.trim(), uses: initial?.uses ?? 0 }
        if (kind === 'link') {
            const url = normalizeUrl(target)
            if (!url) return setError('Geçerli bir adres gir.')
            return onSave({ ...base, kind, url })
        }
        const template = target.trim()
        if (!template.includes('{q}')) return setError('Arama adresi {q} içermeli.')
        const normalized = normalizeUrl(template.replaceAll('{q}', 'q'))
        if (!normalized) return setError('Arama adresi geçerli değil.')
        onSave({ ...base, kind, template: /^https?:\/\//i.test(template) ? template : `https://${template}` })
    }

    return (
        <form class="item" style={{ display: 'grid', gap: '0.55rem' }} onSubmit={submit}>
            <div class="segmented">
                <button type="button" aria-pressed={kind === 'link'} onClick={() => setKind('link')}>
                    Link
                </button>
                <button type="button" aria-pressed={kind === 'search'} onClick={() => setKind('search')}>
                    Arama
                </button>
            </div>
            <input
                class="input"
                value={trigger}
                placeholder="Tetikleyici (ör. npm)"
                aria-label="Komut tetikleyicisi"
                onInput={(e) => setTrigger(e.currentTarget.value)}
            />
            <input
                class="input"
                value={target}
                aria-label={kind === 'link' ? 'Adres' : 'Arama adresi'}
                placeholder={kind === 'link' ? 'npmjs.com' : 'https://www.npmjs.com/search?q={q}'}
                onInput={(e) => setTarget(e.currentTarget.value)}
            />
            {error && (
                <p class="error" role="alert">
                    {error}
                </p>
            )}
            <div class="modal-actions">
                <button type="button" class="btn" onClick={onCancel}>
                    Vazgeç
                </button>
                <button type="submit" class="btn btn-primary">
                    Kaydet
                </button>
            </div>
        </form>
    )
}

function TranslateSection({ command, commands, onSave }: { command: Command; commands: Command[]; onSave: (c: Command) => void }) {
    const [settings, setSettings] = useStored('settings')
    const [trigger, setTrigger] = useState(command.trigger)
    const [template, setTemplate] = useState(command.template ?? TRANSLATE_TEMPLATE)
    const [error, setError] = useState<string | null>(null)

    function commitTrigger() {
        if (trigger === command.trigger) return setError(null)
        const check = validateTrigger(commands, trigger, command.id)
        if (check !== 'ok') return setError(TRIGGER_ERRORS[check])
        setError(null)
        onSave({ ...command, trigger: trigger.trim() })
    }

    function commitTemplate() {
        const next = template.trim()
        if (next === command.template) return setError(null)
        if (!next.includes('{q}')) return setError('Çeviri adresi {q} içermeli.')
        setError(null)
        onSave({ ...command, template: next })
    }

    return (
        <section class="settings-section">
            <h3>Çeviri</h3>
            <p class="hint">
                Palette <strong>{command.trigger} metin</strong> yaz: sonuç listede görünür, Enter panoya kopyalar, Ctrl+Enter çeviri sitesinde açar.
            </p>
            <label class="field">
                Tetikleyici
                <input
                    class="input"
                    value={trigger}
                    aria-label="Çeviri tetikleyicisi"
                    onInput={(e) => setTrigger(e.currentTarget.value)}
                    onBlur={commitTrigger}
                    onKeyDown={(e) => e.key === 'Enter' && commitTrigger()}
                />
            </label>
            <label class="field">
                Çeviri sitesi
                <input
                    class="input"
                    value={template}
                    aria-label="Çeviri sitesi adresi"
                    onInput={(e) => setTemplate(e.currentTarget.value)}
                    onBlur={commitTemplate}
                    onKeyDown={(e) => e.key === 'Enter' && commitTemplate()}
                />
            </label>
            <p class="hint">
                <code>{'{q}'}</code> metnin yerine, <code>{'{from}'}</code> ve <code>{'{to}'}</code> dil kodlarının yerine geçer.
            </p>
            <label class="toggle">
                Çevrimiçi çeviriyi kullan
                <input
                    type="checkbox"
                    checked={settings.translateOnline}
                    onChange={(e) => setSettings({ ...settings, translateOnline: e.currentTarget.checked })}
                />
            </label>
            <p class="hint">
                Kapalıyken yalnızca eklentideki kelime listesi kullanılır ve hiçbir yere istek gitmez. Açıkken tek kelimeler yine yerelden gelir,
                bulunamayanlar ve cümleler MyMemory servisine sorulur.
            </p>
            {error && (
                <p class="error" role="alert">
                    {error}
                </p>
            )}
        </section>
    )
}
