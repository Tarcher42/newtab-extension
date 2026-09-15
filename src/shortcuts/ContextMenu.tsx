import { useEffect, useRef } from 'preact/hooks'

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean }

type Props = { x: number; y: number; items: MenuItem[]; onClose: () => void }

export function ContextMenu({ x, y, items, onClose }: Props) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const onPointer = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose()
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('mousedown', onPointer)
        window.addEventListener('keydown', onKey)
        window.addEventListener('blur', onClose)
        ref.current?.querySelector('button')?.focus()
        return () => {
            window.removeEventListener('mousedown', onPointer)
            window.removeEventListener('keydown', onKey)
            window.removeEventListener('blur', onClose)
        }
    }, [onClose])

    const left = Math.min(x, window.innerWidth - 190)
    const top = Math.min(y, window.innerHeight - items.length * 38 - 16)

    return (
        <div ref={ref} class="context-menu glass" role="menu" style={{ left, top }}>
            {items.map((item) => (
                <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    class={item.danger ? 'btn-danger' : undefined}
                    onClick={() => {
                        onClose()
                        item.onSelect()
                    }}
                >
                    {item.label}
                </button>
            ))}
        </div>
    )
}
