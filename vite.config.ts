/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
    plugins: [preact()],
    base: './',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        target: 'firefox128',
        modulePreload: false,
        rollupOptions: {
            input: {
                newtab: 'newtab.html',
                background: 'src/background/index.ts',
            },
            output: {
                entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
            },
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['tests/setup.ts'],
    },
})
