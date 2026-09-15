import { groupCommands, parseInput, rankCommands, recordUse, resolveCommand, validateTrigger } from '../../src/palette/logic'
import { DEFAULT_COMMANDS } from '../../src/shared/defaults'
import type { Command } from '../../src/shared/types'

const cmd = (trigger: string, uses = 0, kind: Command['kind'] = 'link'): Command => ({
    id: trigger,
    trigger,
    kind,
    url: `https://${trigger}.com`,
    uses,
})

describe('parseInput', () => {
    test('splits trigger and query', () => expect(parseInput('yt lofi beats')).toEqual({ trigger: 'yt', query: 'lofi beats' }))
    test('trims around', () => expect(parseInput('   gh   ')).toEqual({ trigger: 'gh', query: '' }))
    test('empty', () => expect(parseInput('')).toEqual({ trigger: '', query: '' }))
})

describe('rankCommands', () => {
    const commands = [cmd('github', 1), cmd('gh', 0), cmd('agh', 50), cmd('ghost', 9), cmd('zz')]

    test('exact before prefix before includes', () => {
        expect(rankCommands(commands, 'gh').map((c) => c.trigger)).toEqual(['gh', 'ghost', 'agh'])
    })

    test('prefix ties are broken by uses', () => {
        expect(rankCommands(commands, 'g').map((c) => c.trigger)).toEqual(['ghost', 'github', 'gh', 'agh'])
    })

    test('equal uses fall back to alphabetical', () => {
        expect(rankCommands([cmd('gb'), cmd('ga')], 'g').map((c) => c.trigger)).toEqual(['ga', 'gb'])
    })

    test('only the first word is matched', () => {
        expect(rankCommands(commands, 'gh something else').map((c) => c.trigger)[0]).toBe('gh')
    })

    test('case insensitive', () => expect(rankCommands([cmd('GH')], 'gh')).toHaveLength(1))
    test('empty input returns nothing', () => expect(rankCommands(commands, '  ')).toEqual([]))
    test('no match returns nothing', () => expect(rankCommands(commands, 'qq')).toEqual([]))
})

test('groupCommands splits by kind alphabetically', () => {
    const groups = groupCommands(DEFAULT_COMMANDS)
    expect(groups.action.map((c) => c.trigger)).toEqual(['pomo', 'settings', 'skip', 'stop', 'tag', 'word'])
    expect(groups.link.map((c) => c.trigger)).toEqual(['3000', 'gh'])
    expect(groups.search.map((c) => c.trigger)).toEqual(['g', 'yt'])
})

describe('resolveCommand', () => {
    const yt: Command = { id: 'yt', trigger: 'yt', kind: 'search', template: 'https://www.youtube.com/results?search_query={q}', uses: 0 }

    test('link opens its url', () => {
        expect(resolveCommand(cmd('gh'), 'ignored')).toEqual({ type: 'url', url: 'https://gh.com' })
    })

    test('search encodes the query', () => {
        expect(resolveCommand(yt, 'lofi beats & chill')).toEqual({
            type: 'url',
            url: 'https://www.youtube.com/results?search_query=lofi%20beats%20%26%20chill',
        })
    })

    test('search without query opens the site root', () => {
        expect(resolveCommand(yt, '')).toEqual({ type: 'url', url: 'https://www.youtube.com/' })
    })

    test('search template without {q} is invalid', () => {
        expect(resolveCommand({ ...yt, template: 'https://x.com' }, 'a')).toEqual({ type: 'invalid' })
    })

    test('action passes the rest as argument', () => {
        const tag = DEFAULT_COMMANDS.find((c) => c.trigger === 'tag')!
        expect(resolveCommand(tag, 'Matematik')).toEqual({ type: 'action', actionId: 'pomodoro.tag', arg: 'Matematik' })
    })
})

describe('validateTrigger', () => {
    const commands = [cmd('gh'), cmd('yt')]
    test('ok', () => expect(validateTrigger(commands, 'npm')).toBe('ok'))
    test('empty', () => expect(validateTrigger(commands, '  ')).toBe('empty'))
    test('spaces', () => expect(validateTrigger(commands, 'my cmd')).toBe('spaces'))
    test('duplicate ignores case', () => expect(validateTrigger(commands, 'GH')).toBe('duplicate'))
    test('editing itself is not a duplicate', () => expect(validateTrigger(commands, 'gh', 'gh')).toBe('ok'))
})

test('recordUse increments only the used command', () => {
    const next = recordUse([cmd('a', 1), cmd('b', 1)], 'b')
    expect(next.map((c) => c.uses)).toEqual([1, 2])
})
