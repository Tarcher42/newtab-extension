export type ChangeListener = (changes: Record<string, unknown>) => void

export interface StorageArea {
    get(key: string): Promise<unknown>
    set(items: Record<string, unknown>): Promise<void>
    remove(key: string): Promise<void>
    onChanged(listener: ChangeListener): () => void
}

export const browserArea: StorageArea = {
    async get(key) {
        const result = await browser.storage.local.get(key)
        return result[key]
    },
    set: (items) => browser.storage.local.set(items),
    remove: (key) => browser.storage.local.remove(key),
    onChanged(listener) {
        const handler = (changes: Record<string, browser.storage.StorageChange>, area: string) => {
            if (area !== 'local') return
            const values: Record<string, unknown> = {}
            for (const [key, change] of Object.entries(changes)) values[key] = change.newValue
            listener(values)
        }
        browser.storage.onChanged.addListener(handler)
        return () => browser.storage.onChanged.removeListener(handler)
    },
}
