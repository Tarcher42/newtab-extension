import type { Settings } from '../shared/types'

export const BUNDLED_FONTS = ['JetBrains Mono Variable', 'Inter Variable', 'Outfit Variable'] as const

const quote = (name: string) => `"${name.replace(/["\\]/g, '')}"`

export function fontStack(name: string, fallback: string): string {
    const trimmed = name.trim()
    return trimmed ? `${quote(trimmed)}, ${fallback}` : fallback
}

export function applyTheme(settings: Settings, root: HTMLElement = document.documentElement): void {
    root.style.setProperty('--font-ui', fontStack(settings.fonts.ui, '"JetBrains Mono Variable", ui-monospace, monospace'))
    root.style.setProperty('--font-clock', fontStack(settings.fonts.clock, '"Outfit Variable", system-ui, sans-serif'))
    root.style.setProperty('--shadow-strength', String(Math.min(1, Math.max(0, settings.shadowStrength))))
}
