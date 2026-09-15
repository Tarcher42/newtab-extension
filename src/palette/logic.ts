import type { ActionId, Command } from '../shared/types'

export function parseInput(text: string): { trigger: string; query: string } {
    const match = text.trimStart().match(/^(\S*)\s*([\s\S]*)$/)!
    return { trigger: match[1], query: match[2].trim() }
}

function score(trigger: string, typed: string): number {
    const t = trigger.toLocaleLowerCase('tr-TR')
    if (t === typed) return 3
    if (t.startsWith(typed)) return 2
    if (t.includes(typed)) return 1
    return 0
}

export function rankCommands(commands: Command[], text: string): Command[] {
    const typed = parseInput(text).trigger.toLocaleLowerCase('tr-TR')
    if (!typed) return []
    return commands
        .map((command) => ({ command, score: score(command.trigger, typed) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || b.command.uses - a.command.uses || a.command.trigger.localeCompare(b.command.trigger))
        .map((entry) => entry.command)
}

export type CommandGroups = { action: Command[]; link: Command[]; search: Command[] }

export function groupCommands(commands: Command[]): CommandGroups {
    const byTrigger = (a: Command, b: Command) => a.trigger.localeCompare(b.trigger)
    return {
        action: commands.filter((c) => c.kind === 'action').sort(byTrigger),
        link: commands.filter((c) => c.kind === 'link').sort(byTrigger),
        search: commands.filter((c) => c.kind === 'search').sort(byTrigger),
    }
}

export type Resolution = { type: 'url'; url: string } | { type: 'action'; actionId: ActionId; arg: string } | { type: 'invalid' }

export function resolveCommand(command: Command, query: string): Resolution {
    switch (command.kind) {
        case 'link':
            return command.url ? { type: 'url', url: command.url } : { type: 'invalid' }
        case 'search': {
            const template = command.template ?? ''
            if (!template.includes('{q}')) return { type: 'invalid' }
            if (query) return { type: 'url', url: template.replaceAll('{q}', encodeURIComponent(query)) }
            try {
                return { type: 'url', url: `${new URL(template.replaceAll('{q}', '')).origin}/` }
            } catch {
                return { type: 'invalid' }
            }
        }
        case 'action':
            return command.actionId ? { type: 'action', actionId: command.actionId, arg: query } : { type: 'invalid' }
    }
}

export type TriggerCheck = 'ok' | 'empty' | 'spaces' | 'duplicate'

export function validateTrigger(commands: Command[], trigger: string, selfId?: string): TriggerCheck {
    const t = trigger.trim()
    if (!t) return 'empty'
    if (/\s/.test(t)) return 'spaces'
    const lower = t.toLocaleLowerCase('tr-TR')
    const taken = commands.some((c) => c.id !== selfId && c.trigger.toLocaleLowerCase('tr-TR') === lower)
    return taken ? 'duplicate' : 'ok'
}

export function recordUse(commands: Command[], id: string): Command[] {
    return commands.map((c) => (c.id === id ? { ...c, uses: c.uses + 1 } : c))
}
