import { useState } from 'preact/hooks'
import { BUNDLED_FONTS } from '../../newtab/theme'
import type { Settings } from '../../shared/types'
import { BACKGROUND_KEY, putImage } from '../../storage/images'
import { useStored } from '../../storage/useStored'

const MAX_BACKGROUND_BYTES = 15 * 1024 * 1024
const FONT_LABELS: Record<(typeof BUNDLED_FONTS)[number], string> = {
    'JetBrains Mono Variable': 'JetBrains Mono',
    'Inter Variable': 'Inter',
    'Outfit Variable': 'Outfit',
}

export function AppearanceTab() {
    const [settings, setSettings] = useStored('settings')
    const [uploadError, setUploadError] = useState<string | null>(null)
    const set = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch })
    const { background, clock } = settings

    async function onUpload(file: File | undefined) {
        if (!file) return
        if (!file.type.startsWith('image/')) return setUploadError('Sadece görsel dosyası seçebilirsin.')
        if (file.size > MAX_BACKGROUND_BYTES) return setUploadError('Görsel en fazla 15 MB olabilir.')
        try {
            await putImage(BACKGROUND_KEY, file)
            setUploadError(null)
            set({ background: { ...background, type: 'upload', imageVersion: background.imageVersion + 1 } })
        } catch {
            setUploadError('Görsel kaydedilemedi, önceki arka plan korunuyor.')
        }
    }

    return (
        <>
            <section class="settings-section">
                <h3>Arka plan</h3>
                <div class="segmented">
                    {(
                        [
                            ['default', 'Varsayılan'],
                            ['upload', 'Görsel'],
                            ['color', 'Düz renk'],
                        ] as const
                    ).map(([type, label]) => (
                        <button
                            key={type}
                            type="button"
                            aria-pressed={background.type === type}
                            onClick={() => set({ background: { ...background, type } })}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {background.type === 'upload' && (
                    <label class="field">
                        Görsel seç
                        <input class="input" type="file" accept="image/*" onChange={(e) => void onUpload(e.currentTarget.files?.[0])} />
                    </label>
                )}
                {background.type === 'color' && (
                    <label class="row">
                        <input
                            type="color"
                            value={background.color}
                            onInput={(e) => set({ background: { ...background, color: e.currentTarget.value } })}
                        />
                        <span class="hint">{background.color}</span>
                    </label>
                )}
                {uploadError && (
                    <p class="notice is-error" role="alert">
                        {uploadError}
                    </p>
                )}
            </section>

            <section class="settings-section">
                <h3>Yazı tipi</h3>
                <FontPicker label="Genel" value={settings.fonts.ui} onChange={(ui) => set({ fonts: { ...settings.fonts, ui } })} />
                <FontPicker label="Saat" value={settings.fonts.clock} onChange={(c) => set({ fonts: { ...settings.fonts, clock: c } })} />
                <p class="hint">"Diğer" ile bilgisayarında kurulu bir fontun adını yazabilirsin (ör. JetBrainsMono Nerd Font).</p>
            </section>

            <section class="settings-section">
                <h3>Saat</h3>
                <label class="toggle">
                    24 saat biçimi
                    <input type="checkbox" checked={clock.h24} onChange={(e) => set({ clock: { ...clock, h24: e.currentTarget.checked } })} />
                </label>
                <label class="toggle">
                    Saniyeyi göster
                    <input
                        type="checkbox"
                        checked={clock.seconds}
                        onChange={(e) => set({ clock: { ...clock, seconds: e.currentTarget.checked } })}
                    />
                </label>
            </section>

            <section class="settings-section">
                <h3>Gölge yoğunluğu</h3>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.shadowStrength}
                    aria-label="Gölge yoğunluğu"
                    onInput={(e) => set({ shadowStrength: Number(e.currentTarget.value) })}
                />
            </section>
        </>
    )
}

function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (font: string) => void }) {
    const bundled = (BUNDLED_FONTS as readonly string[]).includes(value)
    const [custom, setCustom] = useState(!bundled)

    return (
        <div class="field">
            {label}
            <div class="row">
                <select
                    class="input grow"
                    value={custom ? '__custom' : value}
                    onChange={(e) => {
                        const next = e.currentTarget.value
                        if (next === '__custom') return setCustom(true)
                        setCustom(false)
                        onChange(next)
                    }}
                >
                    {BUNDLED_FONTS.map((font) => (
                        <option key={font} value={font}>
                            {FONT_LABELS[font]}
                        </option>
                    ))}
                    <option value="__custom">Diğer…</option>
                </select>
                {custom && (
                    <input
                        class="input grow"
                        value={bundled ? '' : value}
                        placeholder="Font adı"
                        onChange={(e) => onChange(e.currentTarget.value)}
                    />
                )}
            </div>
        </div>
    )
}
