import { sendTimer } from '../pomodoro/messages'
import type { ActionId, Command } from '../shared/types'

export const ACTION_LABELS: Record<ActionId, string> = {
    'pomodoro.toggle': 'Pomodoro başlat / duraklat',
    'pomodoro.reset': 'Pomodoro sıfırla',
    'pomodoro.skip': 'Sonraki faza geç',
    'pomodoro.tag': 'Etiket ata — tag <ad>',
    'word.next': 'Sonraki kelime',
    'settings.open': 'Ayarları aç',
}

export type ActionContext = {
    openSettings: () => void
    nextWord: () => void
}

export function runAction(actionId: ActionId, arg: string, ctx: ActionContext): void {
    switch (actionId) {
        case 'pomodoro.toggle':
            void sendTimer({ type: 'timer', action: 'toggle' })
            break
        case 'pomodoro.reset':
            void sendTimer({ type: 'timer', action: 'reset' })
            break
        case 'pomodoro.skip':
            void sendTimer({ type: 'timer', action: 'skip' })
            break
        case 'pomodoro.tag':
            void sendTimer({ type: 'timer', action: 'tag', tag: arg })
            break
        case 'word.next':
            ctx.nextWord()
            break
        case 'settings.open':
            ctx.openSettings()
            break
    }
}

const hostOf = (url: string | undefined) => {
    try {
        return new URL((url ?? '').replaceAll('{q}', '')).host
    } catch {
        return url ?? ''
    }
}

export function describeCommand(command: Command): string {
    if (command.kind === 'action') return command.actionId ? ACTION_LABELS[command.actionId] : ''
    if (command.kind === 'search') return `${hostOf(command.template)} · arama`
    return hostOf(command.url)
}
