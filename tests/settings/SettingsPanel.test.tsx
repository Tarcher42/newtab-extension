import { fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { SettingsPanel, type SettingsTab } from '../../src/settings/SettingsPanel'
import { StorageContext } from '../../src/storage/useStored'
import { memoryArea } from '../fakes/memoryArea'

function setup(tab: SettingsTab) {
    const area = memoryArea()
    render(
        <StorageContext.Provider value={area}>
            <SettingsPanel tab={tab} onTab={() => {}} onClose={() => {}} />
        </StorageContext.Provider>,
    )
    return area
}

test('switching to 12-hour clock saves settings', async () => {
    const area = setup('appearance')
    fireEvent.click(screen.getByLabelText('24 saat biçimi'))
    await waitFor(() => expect((area.data.settings as { clock: { h24: boolean } }).clock.h24).toBe(false))
})

test('a new command with a taken trigger shows an error', async () => {
    const area = setup('commands')
    fireEvent.click(screen.getByText('Yeni komut'))
    fireEvent.input(screen.getByLabelText('Tetikleyici'), { target: { value: 'gh' } })
    fireEvent.input(screen.getByLabelText('Adres'), { target: { value: 'gitlab.com' } })
    fireEvent.click(screen.getByText('Kaydet'))
    expect(screen.getByRole('alert').textContent).toBe('Bu tetikleyici zaten kullanılıyor.')
    expect(area.data.commands).toBeUndefined()
})

test('adding a search command stores its template', async () => {
    const area = setup('commands')
    fireEvent.click(screen.getByText('Yeni komut'))
    fireEvent.click(screen.getByText('Arama'))
    fireEvent.input(screen.getByLabelText('Tetikleyici'), { target: { value: 'npm' } })
    fireEvent.input(screen.getByLabelText('Arama adresi'), { target: { value: 'https://www.npmjs.com/search?q={q}' } })
    fireEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => {
        const commands = area.data.commands as { trigger: string; template?: string }[]
        expect(commands.find((c) => c.trigger === 'npm')?.template).toBe('https://www.npmjs.com/search?q={q}')
    })
})
