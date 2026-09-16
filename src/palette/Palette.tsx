import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Command } from '../shared/types'
import { buildTranslateUrl, directionLabel } from '../translate/logic'
import { useTranslation } from '../translate/useTranslation'
import { describeCommand } from './actions'
import { groupCommands, parseInput, rankCommands } from './logic'
import './palette.css'

type Props = {
    commands: Command[]
    translateOnline: boolean
    onRun: (command: Command, query: string, newTab: boolean) => void
    onOpenUrl: (url: string, newTab: boolean) => void
}

type Row = { kind: 'header'; label: string } | { kind: 'command'; command: Command; index: number }

const GROUP_LABELS = { action: 'Eylemler', translate: 'Çeviri', link: 'Linkler', search: 'Aramalar' } as const

const isTypingTarget = (el: EventTarget | null) =>
    el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export function Palette({ commands, translateOnline, onRun, onOpenUrl }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const [text, setText] = useState('')
    const [focused, setFocused] = useState(false)
    const [selected, setSelected] = useState(0)
    const [shaking, setShaking] = useState(false)
    const [copied, setCopied] = useState(false)

    const parsed = parseInput(text)
    const translateCommand = useMemo(
        () => commands.find((c) => c.kind === 'translate' && c.trigger.toLocaleLowerCase('tr-TR') === parsed.trigger.toLocaleLowerCase('tr-TR')),
        [commands, parsed.trigger],
    )
    const translation = useTranslation(translateCommand ? parsed.query : '', translateOnline)

    const rows = useMemo<Row[]>(() => {
        if (text.trim()) return rankCommands(commands, text).map((command, index) => ({ kind: 'command', command, index }))
        const groups = groupCommands(commands)
        const out: Row[] = []
        let index = 0
        for (const key of ['action', 'translate', 'link', 'search'] as const) {
            if (!groups[key].length) continue
            out.push({ kind: 'header', label: GROUP_LABELS[key] })
            for (const command of groups[key]) out.push({ kind: 'command', command, index: index++ })
        }
        return out
    }, [commands, text])

    const items = rows.filter((r): r is Extract<Row, { kind: 'command' }> => r.kind === 'command')

    useEffect(() => {
        setSelected(0)
        setCopied(false)
    }, [text])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const ctrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'
            const slash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target)
            if (!ctrlK && !slash) return
            e.preventDefault()
            inputRef.current?.focus()
            inputRef.current?.select()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    useEffect(() => {
        listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
    }, [selected])

    function close() {
        setText('')
        inputRef.current?.blur()
    }

    function shake() {
        setShaking(false)
        requestAnimationFrame(() => setShaking(true))
    }

    /** Enter copies the translation and keeps the palette open; Ctrl+Enter opens the translation site. */
    function runTranslate(command: Command, newTab: boolean) {
        if (!parsed.query) return shake()
        onRun(command, parsed.query, newTab)
        if (newTab || !translation.text) {
            onOpenUrl(buildTranslateUrl(command.template ?? '', translation.input, translation.direction), true)
            return
        }
        navigator.clipboard
            .writeText(translation.text)
            .then(() => setCopied(true))
            .catch(() => shake())
    }

    function run(command: Command | undefined, newTab: boolean) {
        if (!command) return shake()
        if (command.kind === 'translate') return runTranslate(command, newTab)
        onRun(command, parsed.query, newTab)
        close()
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (!items.length) return
            const delta = e.key === 'ArrowDown' ? 1 : -1
            setSelected((s) => (s + delta + items.length) % items.length)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            run(items[selected]?.command, e.ctrlKey || e.metaKey)
        } else if (e.key === 'Escape') {
            e.preventDefault()
            close()
        }
    }

    function describe(command: Command): string {
        if (command !== translateCommand) return describeCommand(command)
        if (!parsed.query) return describeCommand(command)
        if (copied && translation.text) return `${translation.text} · kopyalandı`
        if (translation.loading) return 'çevriliyor…'
        if (translation.text) {
            const source = translation.source === 'local' ? 'yerel liste' : 'çevrimiçi'
            return `${translation.text} · ${directionLabel(translation.direction)} · ${source}`
        }
        return translateOnline ? 'çeviri alınamadı · Ctrl+Enter ile sitede aç' : 'yerel listede yok · Ctrl+Enter ile sitede aç'
    }

    const open = focused

    return (
        <>
            {open && <div class="palette-backdrop" onMouseDown={close} />}
            <div class={`palette${open ? ' is-open' : ''}`}>
                <div class={`palette-box glass${shaking ? ' is-shaking' : ''}`} onAnimationEnd={() => setShaking(false)}>
                    <span class="palette-prompt" aria-hidden="true">
                        ›
                    </span>
                    <input
                        ref={inputRef}
                        class="palette-input"
                        value={text}
                        placeholder="Komut yaz…"
                        spellcheck={false}
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls="palette-list"
                        aria-label="Komut paleti"
                        onInput={(e) => setText(e.currentTarget.value)}
                        onKeyDown={onKeyDown}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                    />
                    <kbd class="palette-hint">Ctrl K</kbd>
                </div>
                {open && (
                    <ul id="palette-list" ref={listRef} class="palette-list glass" role="listbox">
                        {rows.length === 0 && <li class="palette-empty">Eşleşen komut yok</li>}
                        {rows.map((row) =>
                            row.kind === 'header' ? (
                                <li key={`h-${row.label}`} class="palette-header" role="presentation">
                                    {row.label}
                                </li>
                            ) : (
                                <li
                                    key={row.command.id}
                                    role="option"
                                    aria-selected={row.index === selected}
                                    class={`palette-item${row.command === translateCommand && parsed.query ? ' is-translation' : ''}`}
                                    onMouseEnter={() => setSelected(row.index)}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        run(row.command, e.ctrlKey || e.metaKey || e.button === 1)
                                    }}
                                >
                                    <span class={`palette-trigger kind-${row.command.kind}`}>{row.command.trigger}</span>
                                    <span class="palette-desc">{describe(row.command)}</span>
                                </li>
                            ),
                        )}
                    </ul>
                )}
            </div>
        </>
    )
}
