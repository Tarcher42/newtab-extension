import { useState } from 'preact/hooks'
import { DownloadIcon } from '../../newtab/icons'
import { dayKey } from '../../shared/time'
import { exportData, importData } from '../../storage/backup'
import { BACKGROUND_KEY, deleteImage } from '../../storage/images'
import { save, STORE_KEYS } from '../../storage/store'
import { useStorageArea, useStored } from '../../storage/useStored'

type Notice = { text: string; error?: boolean }

export function DataTab() {
    const area = useStorageArea()
    const [sessions] = useStored('sessions')
    const [notice, setNotice] = useState<Notice | null>(null)

    async function onExport() {
        const blob = new Blob([await exportData(area)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `newtab-yedek-${dayKey(new Date())}.json`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        setNotice({ text: 'Yedek indirildi.' })
    }

    async function onImport(file: File | undefined) {
        if (!file) return
        const result = await importData(area, await file.text())
        setNotice(result.ok ? { text: 'Yedek yüklendi.' } : { text: result.error, error: true })
    }

    async function onClearSessions() {
        if (!window.confirm('Tüm çalışma geçmişi silinsin mi? Bu geri alınamaz.')) return
        await save(area, 'sessions', [])
        setNotice({ text: 'Çalışma geçmişi silindi.' })
    }

    async function onResetAll() {
        if (!window.confirm('Tüm ayarlar, kısayollar, komutlar ve geçmiş silinsin mi? Bu geri alınamaz.')) return
        for (const key of STORE_KEYS) await area.remove(key)
        await deleteImage(BACKGROUND_KEY).catch(() => undefined)
        window.location.reload()
    }

    return (
        <>
            <section class="settings-section">
                <h3>Yedekleme</h3>
                <p class="hint">Ayarlar, kısayollar, komutlar, çalışma geçmişi ve kelime ilerlemen tek bir JSON dosyasına kaydedilir. Arka plan görseli dahil değildir.</p>
                <div class="row">
                    <button type="button" class="btn" onClick={() => void onExport()}>
                        <DownloadIcon /> Dışa aktar
                    </button>
                    <label class="btn">
                        İçe aktar
                        <input type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e.currentTarget.files?.[0])} />
                    </label>
                </div>
            </section>

            <section class="settings-section">
                <h3>Temizlik</h3>
                <div class="row row-between">
                    <span class="hint">{sessions.length} çalışma oturumu kayıtlı</span>
                    <button type="button" class="btn btn-danger" disabled={sessions.length === 0} onClick={() => void onClearSessions()}>
                        Geçmişi sil
                    </button>
                </div>
                <div class="row row-between">
                    <span class="hint">Her şeyi varsayılana döndür</span>
                    <button type="button" class="btn btn-danger" onClick={() => void onResetAll()}>
                        Sıfırla
                    </button>
                </div>
            </section>

            {notice && (
                <p class={notice.error ? 'notice is-error' : 'notice'} role="status">
                    {notice.text}
                </p>
            )}
        </>
    )
}
