import { fireEvent, render, screen } from '@testing-library/preact'
import { ShortcutEditor } from '../../src/shortcuts/ShortcutEditor'

test('invalid address shows an error and does not save', () => {
    const onSave = vi.fn()
    render(<ShortcutEditor onSave={onSave} onClose={() => {}} />)
    fireEvent.input(screen.getByPlaceholderText('github.com'), { target: { value: 'not a url' } })
    fireEvent.click(screen.getByText('Kaydet'))
    expect(screen.getByRole('alert').textContent).toContain('Geçerli bir adres')
    expect(onSave).not.toHaveBeenCalled()
})

test('saving fills the title from the address', () => {
    const onSave = vi.fn()
    render(<ShortcutEditor onSave={onSave} onClose={() => {}} />)
    fireEvent.input(screen.getByPlaceholderText('github.com'), { target: { value: 'github.com' } })
    fireEvent.click(screen.getByText('Kaydet'))
    expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://github.com/', title: 'Github', icon: { type: 'auto' } }),
    )
})

test('editing keeps the id', () => {
    const onSave = vi.fn()
    const initial = { id: 'keep', title: 'X', url: 'https://x.com/', icon: { type: 'letter' as const } }
    render(<ShortcutEditor initial={initial} onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByText('Kaydet'))
    expect(onSave.mock.calls[0][0].id).toBe('keep')
})
