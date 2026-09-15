import { render, screen } from '@testing-library/preact'
import { App } from '../src/newtab/App'

test('renders the page root', () => {
    render(<App />)
    expect(screen.getByTestId('page')).toBeTruthy()
})
