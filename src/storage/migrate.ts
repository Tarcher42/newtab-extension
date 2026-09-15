import { SCHEMA_VERSION } from '../shared/defaults'

type Raw = Record<string, unknown>

/** Each entry upgrades settings from version `n` to `n + 1`. */
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {}

export function migrateSettings(raw: unknown): Raw {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
    let current = { ...(raw as Raw) }
    let version = typeof current.schemaVersion === 'number' ? current.schemaVersion : SCHEMA_VERSION

    while (version < SCHEMA_VERSION) {
        const step = MIGRATIONS[version]
        if (step) current = step(current)
        version++
    }
    current.schemaVersion = SCHEMA_VERSION
    return current
}
