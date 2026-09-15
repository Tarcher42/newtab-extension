import { useEffect, useState } from 'preact/hooks'
import type { Settings } from '../shared/types'
import { BACKGROUND_KEY, getImage } from '../storage/images'

/** Served from `public/`, next to newtab.html. */
const defaultBackground = 'bg-default.svg'

export function Background({ background }: { background: Settings['background'] }) {
    const [uploaded, setUploaded] = useState<string | null>(null)

    useEffect(() => {
        if (background.type !== 'upload') return
        let url: string | null = null
        let active = true
        getImage(BACKGROUND_KEY)
            .then((blob) => {
                if (!active || !blob) return
                url = URL.createObjectURL(blob)
                setUploaded(url)
            })
            .catch(() => setUploaded(null))
        return () => {
            active = false
            if (url) URL.revokeObjectURL(url)
        }
    }, [background.type, background.imageVersion])

    const image = background.type === 'upload' ? (uploaded ?? defaultBackground) : background.type === 'default' ? defaultBackground : null

    return (
        <div
            class="background"
            aria-hidden="true"
            style={{
                backgroundColor: background.color,
                backgroundImage: image ? `url("${image}")` : 'none',
            }}
        />
    )
}
