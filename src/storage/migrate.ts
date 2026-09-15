import { SCHEMA_VERSION } from '../shared/defaults'

type Raw = Record<string, unknown>

/** Each entry upgrades settings from version `n` to `n + 1`. */
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
    // v2: the clock default moved from Outfit to JetBrains Mono. Only the old default is replaced.
    1: (raw) => {
        const fonts = raw.fonts as Raw | undefined
        if (fonts?.clock !== 'Outfit Variable') return raw
        return { ...raw, fonts: { ...fonts, clock: 'JetBrains Mono Variable' } }
    },
}

export function migrateSettings(raw: unknown): Raw {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
    let current = { ...(raw as Raw) }
    // Settings saved before versioning existed are treated as version 1.
    let version = typeof current.schemaVersion === 'number' ? current.schemaVersion : 1

    while (version < SCHEMA_VERSION) {
        const step = MIGRATIONS[version]
        if (step) current = step(current)
        version++
    }
    current.schemaVersion = SCHEMA_VERSION
    return current
}
