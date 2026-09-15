import { useCallback, useEffect, useState } from 'preact/hooks'
import { runAction } from '../palette/actions'
import { recordUse, resolveCommand } from '../palette/logic'
import { Palette } from '../palette/Palette'
import { PomodoroWidget } from '../pomodoro/PomodoroWidget'
import { SettingsPanel, type SettingsTab } from '../settings/SettingsPanel'
import type { Command, Shortcut, Side, WidgetId } from '../shared/types'
import { ContextMenu } from '../shortcuts/ContextMenu'
import { addShortcut, removeShortcut, updateShortcut } from '../shortcuts/logic'
import { ShortcutEditor } from '../shortcuts/ShortcutEditor'
import { ShortcutGroup } from '../shortcuts/ShortcutGroup'
import { StatsWidget } from '../stats/StatsWidget'
import { useStored } from '../storage/useStored'
import { WORD_NEXT_EVENT, WordWidget } from '../word/WordWidget'
import { Background } from './Background'
import { Clock } from './Clock'
import { SettingsButton } from './SettingsButton'
import { applyTheme } from './theme'

const WIDGETS: Record<WidgetId, () => preact.JSX.Element> = {
    word: WordWidget,
    pomodoro: PomodoroWidget,
    stats: StatsWidget,
}

type EditorState = { side: Side; initial?: Shortcut }
type MenuState = { shortcut: Shortcut; x: number; y: number }

export function App() {
    const [settings] = useStored('settings')
    const [groups, setGroups] = useStored('groups')
    const [commands, setCommands] = useStored('commands')
    const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null)
    const [editor, setEditor] = useState<EditorState | null>(null)
    const [menu, setMenu] = useState<MenuState | null>(null)

    useEffect(() => applyTheme(settings), [settings])

    const closeEditor = useCallback(() => setEditor(null), [])
    const closeMenu = useCallback(() => setMenu(null), [])
    const closeSettings = useCallback(() => setSettingsTab(null), [])

    function onRun(command: Command, query: string, newTab: boolean) {
        const resolution = resolveCommand(command, query)
        if (resolution.type === 'invalid') return
        setCommands(recordUse(commands, command.id))
        if (resolution.type === 'url') {
            if (newTab) void browser.tabs.create({ url: resolution.url })
            else window.location.assign(resolution.url)
            return
        }
        runAction(resolution.actionId, resolution.arg, {
            openSettings: () => setSettingsTab('appearance'),
            nextWord: () => window.dispatchEvent(new Event(WORD_NEXT_EVENT)),
        })
    }

    function saveShortcut(shortcut: Shortcut) {
        if (!editor) return
        setGroups(editor.initial ? updateShortcut(groups, shortcut.id, shortcut) : addShortcut(groups, editor.side, shortcut))
        setEditor(null)
    }

    const sideOf = (shortcut: Shortcut): Side => (groups.left.some((s) => s.id === shortcut.id) ? 'left' : 'right')
    const openMenu = (shortcut: Shortcut, x: number, y: number) => setMenu({ shortcut, x, y })

    return (
        <>
            <Background background={settings.background} />
            <main class="page" data-testid="page">
                <Palette commands={commands} onRun={onRun} />
                <div class="hero">
                    <ShortcutGroup side="left" shortcuts={groups.left} onAdd={(side) => setEditor({ side })} onContextMenu={openMenu} />
                    <Clock clock={settings.clock} />
                    <ShortcutGroup side="right" shortcuts={groups.right} onAdd={(side) => setEditor({ side })} onContextMenu={openMenu} />
                </div>
                <div class="widgets">
                    {settings.widgetOrder
                        .filter((id) => settings.widgetsEnabled[id])
                        .map((id) => {
                            const Widget = WIDGETS[id]
                            return <Widget key={id} />
                        })}
                </div>
            </main>
            <SettingsButton onOpen={() => setSettingsTab('appearance')} />

            {menu && (
                <ContextMenu
                    x={menu.x}
                    y={menu.y}
                    onClose={closeMenu}
                    items={[
                        { label: 'Düzenle', onSelect: () => setEditor({ side: sideOf(menu.shortcut), initial: menu.shortcut }) },
                        { label: 'İkonu değiştir', onSelect: () => setEditor({ side: sideOf(menu.shortcut), initial: menu.shortcut }) },
                        { label: 'Sil', danger: true, onSelect: () => setGroups(removeShortcut(groups, menu.shortcut.id)) },
                    ]}
                />
            )}
            {editor && <ShortcutEditor initial={editor.initial} onSave={saveShortcut} onClose={closeEditor} />}
            {settingsTab && <SettingsPanel tab={settingsTab} onTab={setSettingsTab} onClose={closeSettings} />}
        </>
    )
}
