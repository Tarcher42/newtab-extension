import { useCallback, useContext, useEffect, useState } from 'preact/hooks'
import { createContext } from 'preact'
import { browserArea, type StorageArea } from './area'
import { defaultsFor, load, normalize, save, type StoreKey, type StoreShape } from './store'

export const StorageContext = createContext<StorageArea>(browserArea)

export function useStorageArea(): StorageArea {
    return useContext(StorageContext)
}

/** Reads a store key, keeps it in sync across tabs, and returns a setter that persists. */
export function useStored<K extends StoreKey>(key: K): [StoreShape[K], (next: StoreShape[K]) => void, boolean] {
    const area = useStorageArea()
    const [value, setValue] = useState<StoreShape[K]>(() => defaultsFor(key))
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        let active = true
        load(area, key).then((v) => {
            if (!active) return
            setValue(v)
            setLoaded(true)
        })
        const unsubscribe = area.onChanged((changes) => {
            if (key in changes) setValue(normalize(key, changes[key]))
        })
        return () => {
            active = false
            unsubscribe()
        }
    }, [area, key])

    const set = useCallback(
        (next: StoreShape[K]) => {
            setValue(next)
            void save(area, key, next)
        },
        [area, key],
    )

    return [value, set, loaded]
}
