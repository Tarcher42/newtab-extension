const DB_NAME = 'newtab'
const STORE = 'images'

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1)
        request.onupgradeneeded = () => request.result.createObjectStore(STORE)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDb()
    try {
        return await new Promise<T>((resolve, reject) => {
            const request = fn(db.transaction(STORE, mode).objectStore(STORE))
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    } finally {
        db.close()
    }
}

export async function putImage(key: string, blob: Blob): Promise<void> {
    await run('readwrite', (store) => store.put(blob, key))
}

export async function getImage(key: string): Promise<Blob | null> {
    return ((await run('readonly', (store) => store.get(key))) as Blob | undefined) ?? null
}

export async function deleteImage(key: string): Promise<void> {
    await run('readwrite', (store) => store.delete(key))
}

export const BACKGROUND_KEY = 'background'
