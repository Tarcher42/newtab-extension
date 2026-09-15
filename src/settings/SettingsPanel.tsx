import { useEffect } from 'preact/hooks'
import { CloseIcon } from '../newtab/icons'
import { AppearanceTab } from './tabs/AppearanceTab'
import { CommandsTab } from './tabs/CommandsTab'
import { DataTab } from './tabs/DataTab'
import { ShortcutsTab } from './tabs/ShortcutsTab'
import { WidgetsTab } from './tabs/WidgetsTab'
import './settings.css'

export type SettingsTab = 'appearance' | 'shortcuts' | 'commands' | 'widgets' | 'data'

const TABS: { id: SettingsTab; label: string }[] = [
    { id: 'appearance', label: 'Görünüm' },
    { id: 'shortcuts', label: 'Kısayollar' },
    { id: 'commands', label: 'Komutlar' },
    { id: 'widgets', label: "Widget'lar" },
    { id: 'data', label: 'Veri' },
]

type Props = { tab: SettingsTab; onTab: (tab: SettingsTab) => void; onClose: () => void }

export function SettingsPanel({ tab, onTab, onClose }: Props) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Nested dialogs (shortcut editor) handle their own Escape.
            if (e.key === 'Escape' && !document.querySelector('.modal-backdrop')) onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div class="settings-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <aside class="settings glass" role="dialog" aria-label="Ayarlar">
                <header class="settings-header">
                    <h2>Ayarlar</h2>
                    <button type="button" class="settings-close" onClick={onClose} aria-label="Kapat">
                        <CloseIcon />
                    </button>
                </header>
                <nav class="settings-tabs" role="tablist">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={t.id === tab}
                            class={t.id === tab ? 'is-active' : undefined}
                            onClick={() => onTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
                <div class="settings-body" role="tabpanel">
                    {tab === 'appearance' && <AppearanceTab />}
                    {tab === 'shortcuts' && <ShortcutsTab />}
                    {tab === 'commands' && <CommandsTab />}
                    {tab === 'widgets' && <WidgetsTab />}
                    {tab === 'data' && <DataTab />}
                </div>
            </aside>
        </div>
    )
}
