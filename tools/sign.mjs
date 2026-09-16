/**
 * Submits dist/ to addons.mozilla.org for signing.
 *
 *   node tools/sign.mjs unlisted   # signed .xpi you distribute yourself
 *   node tools/sign.mjs listed     # submission for the public listing
 *
 * Credentials come from ../.env.local (AMO_JWT_ISSUER, AMO_JWT_SECRET) and are
 * never printed. Create them at https://addons.mozilla.org/developers/addon/api/key/
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const ENV_FILE = join(ROOT, '..', '.env.local')
const channel = process.argv[2] ?? 'unlisted'

if (!['listed', 'unlisted'].includes(channel)) {
    console.error(`Bilinmeyen kanal: ${channel}. "listed" ya da "unlisted" olmalı.`)
    process.exit(1)
}

if (!existsSync(ENV_FILE)) {
    console.error(`Kimlik dosyası bulunamadı: ${ENV_FILE}`)
    process.exit(1)
}

const env = Object.fromEntries(
    [...readFileSync(ENV_FILE, 'utf8').matchAll(/^\s*([A-Z_]+)\s*=\s*(.*)$/gm)].map((m) => [m[1], m[2].trim()]),
)

const issuer = env.AMO_JWT_ISSUER
const secret = env.AMO_JWT_SECRET
if (!issuer || !secret) {
    console.error('AMO_JWT_ISSUER ve AMO_JWT_SECRET .env.local içinde dolu olmalı.')
    process.exit(1)
}

if (!existsSync(join(ROOT, 'dist', 'manifest.json'))) {
    console.error('dist/ hazır değil. Önce: npm run build')
    process.exit(1)
}

const args = [
    'web-ext',
    'sign',
    '--source-dir',
    'dist',
    '--artifacts-dir',
    'artifacts',
    '--channel',
    channel,
    '--api-key',
    issuer,
    '--api-secret',
    secret,
]

// A listed version is reviewed by people: it carries the store texts and, because dist/
// is built with Vite, the readable source it was built from.
if (channel === 'listed') {
    const metadata = join(ROOT, 'amo-metadata.json')
    const source = join(ROOT, 'artifacts', 'DevTab-source.zip')
    if (!existsSync(source)) {
        console.error('Kaynak arşivi yok. Önce: npm run source-archive')
        process.exit(1)
    }
    args.push('--amo-metadata', metadata, '--upload-source-code', source)
}

console.log(`AMO'ya gönderiliyor · kanal: ${channel}`)
const child = spawn('npx', args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' })
child.on('exit', (code) => process.exit(code ?? 1))
