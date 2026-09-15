import { useEffect, useState } from 'preact/hooks'
import { newId } from '../shared/id'
import type { Shortcut, ShortcutIcon } from '../shared/types'
import { blobToDataUrl } from './favicon'
import { normalizeUrl, titleFromUrl } from './logic'

const MAX_ICON_BYTES = 512 * 1024

type Props = {
    initial?: Shortcut
    onSave: (shortcut: Shortcut) => void
    onClose: () => void
}

export function ShortcutEditor({ initial, onSave, onClose }: Props) {
    const [url, setUrl] = useState(initial?.url ?? '')
    const [title, setTitle] = useState(initial?.title ?? '')
    const [iconType, setIconType] = useState<ShortcutIcon['type']>(initial?.icon.type ?? 'auto')
    const [iconValue, setIconValue] = useState(initial?.icon.value ?? '')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    async function onFile(file: File | undefined) {
        if (!file) return
        if (!file.type.startsWith('image/')) return setError('Sadece görsel dosyası seçebilirsin.')
        if (file.size > MAX_ICON_BYTES) return setError('İkon en fazla 512 KB olabilir.')
        setError(null)
        setIconValue(await blobToDataUrl(file))
    }

    function submit(e: Event) {
        e.preventDefault()
        const normalized = normalizeUrl(url)
        if (!normalized) return setError('Geçerli bir adres gir (ör. github.com).')
        if ((iconType === 'url' || iconType === 'upload') && !iconValue) return setError('İkon için bir adres ya da dosya seç.')
        if (iconType === 'url' && !normalizeUrl(iconValue)) return setError('İkon adresi geçerli değil.')

        const icon: ShortcutIcon = iconType === 'url' || iconType === 'upload' ? { type: iconType, value: iconValue } : { type: iconType }
        onSave({
            id: initial?.id ?? newId(),
            url: normalized,
            title: title.trim() || titleFromUrl(normalized),
            icon,
        })
    }

    return (
        <div class="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <form class="modal glass" onSubmit={submit} aria-label="Kısayol">
                <h2>{initial ? 'Kısayolu düzenle' : 'Yeni kısayol'}</h2>
                <label class="field">
                    Adres
                    <input class="input" value={url} onInput={(e) => setUrl(e.currentTarget.value)} placeholder="github.com" autoFocus />
                </label>
                <label class="field">
                    Başlık
                    <input class="input" value={title} onInput={(e) => setTitle(e.currentTarget.value)} placeholder="Boş bırakırsan adresten alınır" />
                </label>
                <label class="field">
                    İkon
                    <select
                        class="input"
                        value={iconType}
                        onChange={(e) => {
                            setIconType(e.currentTarget.value as ShortcutIcon['type'])
                            setIconValue('')
                        }}
                    >
                        <option value="auto">Otomatik (sitenin ikonu)</option>
                        <option value="url">İkon adresi</option>
                        <option value="upload">Dosya yükle</option>
                        <option value="letter">Baş harf</option>
                    </select>
                </label>
                {iconType === 'url' && (
                    <label class="field">
                        İkon adresi
                        <input class="input" value={iconValue} onInput={(e) => setIconValue(e.currentTarget.value)} placeholder="https://…/icon.png" />
                    </label>
                )}
                {iconType === 'upload' && (
                    <label class="field">
                        Görsel
                        <input class="input" type="file" accept="image/*" onChange={(e) => void onFile(e.currentTarget.files?.[0])} />
                    </label>
                )}
                {error && (
                    <p class="error" role="alert">
                        {error}
                    </p>
                )}
                <div class="modal-actions">
                    <button type="button" class="btn" onClick={onClose}>
                        Vazgeç
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Kaydet
                    </button>
                </div>
            </form>
        </div>
    )
}
