import type { ChangeListener, StorageArea } from '../../src/storage/area'

export function memoryArea(initial: Record<string, unknown> = {}): StorageArea & { data: Record<string, unknown> } {
    const data: Record<string, unknown> = structuredClone(initial)
    const listeners = new Set<ChangeListener>()
    return {
        data,
        async get(key) {
            return structuredClone(data[key])
        },
        async set(items) {
            Object.assign(data, structuredClone(items))
            listeners.forEach((l) => l(structuredClone(items)))
        },
        async remove(key) {
            delete data[key]
            listeners.forEach((l) => l({ [key]: undefined }))
        },
        onChanged(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
    }
}
