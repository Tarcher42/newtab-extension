import { fireEvent, render, screen } from '@testing-library/preact'
import { Palette } from '../../src/palette/Palette'
import { DEFAULT_COMMANDS } from '../../src/shared/defaults'

function setup() {
    const onRun = vi.fn()
    render(<Palette commands={DEFAULT_COMMANDS} onRun={onRun} />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    return { onRun, input }
}

test('shows grouped commands when focused and empty', () => {
    const { input } = setup()
    fireEvent.focus(input)
    expect(screen.getByText('Eylemler')).toBeTruthy()
    expect(screen.getByText('Linkler')).toBeTruthy()
    expect(screen.getByText('Aramalar')).toBeTruthy()
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
