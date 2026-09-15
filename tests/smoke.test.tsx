import { render, screen } from '@testing-library/preact'
import { App } from '../src/newtab/App'
import { StorageContext } from '../src/storage/useStored'
import { memoryArea } from './fakes/memoryArea'

test('renders palette, clock, both groups and the three widgets', () => {
    render(
        <StorageContext.Provider value={memoryArea()}>
            <App />
        </StorageContext.Provider>,
    )
    expect(screen.getByTestId('page')).toBeTruthy()
    expect(screen.getByLabelText('Komut paleti')).toBeTruthy()
    expect(screen.getAllByText('Add New Tab')).toHaveLength(2)
    expect(screen.getByLabelText('Günün kelimesi')).toBeTruthy()
    expect(screen.getByLabelText('Pomodoro')).toBeTruthy()
    expect(screen.getByLabelText('Çalışma istatistiği')).toBeTruthy()
})
