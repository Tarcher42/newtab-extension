import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/preact'
import { afterEach } from 'vitest'

// jsdom does not implement layout APIs.
Element.prototype.scrollIntoView ??= function scrollIntoView() {}

afterEach(() => cleanup())
