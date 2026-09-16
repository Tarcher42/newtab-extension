import { fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { Palette } from '../../src/palette/Palette'
import { DEFAULT_COMMANDS } from '../../src/shared/defaults'
import { StorageContext } from '../../src/storage/useStored'
import { memoryArea } from '../fakes/memoryArea'

function setup(translateOnline = false) {
    const onRun = vi.fn()
    const onOpenUrl = vi.fn()
    render(
        <StorageContext.Provider value={memoryArea()}>
            <Palette commands={DEFAULT_COMMANDS} translateOnline={translateOnline} onRun={onRun} onOpenUrl={onOpenUrl} />
        </StorageContext.Provider>,
    )
    const input = screen.getByLabelText('Komut paleti') as HTMLInputElement
    return { onRun, onOpenUrl, input }
}

test('shows grouped commands when focused and empty', () => {
    const { input } = setup()
    fireEvent.focus(input)
    for (const label of ['Eylemler', 'Çeviri', 'Linkler', 'Aramalar']) expect(screen.getByText(label)).toBeTruthy()
})

test('typing a search command and pressing Enter runs it with the query', () => {
    const { input, onRun } = setup()
    fireEvent.focus(input)
    fireEvent.input(input, { target: { value: 'yt lofi beats' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'yt' }), 'lofi beats', false)
})

test('arrow keys move the selection', () => {
    const { input, onRun } = setup()
    fireEvent.focus(input)
    fireEvent.input(input, { target: { value: 's' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })
    const [command, , newTab] = onRun.mock.calls[0]
    expect(command.trigger).toBe('skip')
    expect(newTab).toBe(true)
})

test('Enter without a match shakes and runs nothing', async () => {
    const { input, onRun } = setup()
    fireEvent.focus(input)
    fireEvent.input(input, { target: { value: 'qqq' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    expect(onRun).not.toHaveBeenCalled()
    expect(document.querySelector('.palette-box')?.classList.contains('is-shaking')).toBe(true)
})

test('Ctrl+K focuses the palette', () => {
    const { input } = setup()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(document.activeElement).toBe(input)
})

describe('translation', () => {
    test('Ctrl+Enter opens the translation site with the detected direction', async () => {
        const { input, onOpenUrl } = setup()
        fireEvent.focus(input)
        fireEvent.input(input, { target: { value: 'tr güç' } })
        fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })
        await waitFor(() => expect(onOpenUrl).toHaveBeenCalled())
        const [url, newTab] = onOpenUrl.mock.calls[0]
        expect(url).toContain('source_lang=tr&target_lang=en')
        expect(url).toContain(encodeURIComponent('güç'))
        expect(newTab).toBe(true)
    })

    test('Enter without text shakes instead of translating', async () => {
        const { input, onOpenUrl, onRun } = setup()
        fireEvent.focus(input)
        fireEvent.input(input, { target: { value: 'tr' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        await new Promise((r) => requestAnimationFrame(() => r(null)))
        expect(onOpenUrl).not.toHaveBeenCalled()
        expect(onRun).not.toHaveBeenCalled()
        expect(document.querySelector('.palette-box')?.classList.contains('is-shaking')).toBe(true)
    })

    test('offline mode tells the user to open the site', async () => {
        const { input } = setup(false)
        fireEvent.focus(input)
        fireEvent.input(input, { target: { value: 'tr hello world' } })
        await waitFor(() => expect(screen.getByText(/Ctrl\+Enter ile sitede aç/)).toBeTruthy())
    })
})
