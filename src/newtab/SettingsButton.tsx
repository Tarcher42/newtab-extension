import { GearIcon } from './icons'

export function SettingsButton({ onOpen }: { onOpen: () => void }) {
    return (
        <div class="corner-zone">
            <button type="button" class="settings-button" onClick={onOpen} aria-label="Ayarlar" title="Ayarlar">
                <GearIcon />
            </button>
        </div>
    )
}
