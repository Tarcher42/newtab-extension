import './fonts.css'
import './base.css'
import './widgets.css'
import { render } from 'preact'
import { App } from './App'

if (import.meta.env.DEV && typeof browser === 'undefined') await import('./devShim')

render(<App />, document.getElementById('app')!)
