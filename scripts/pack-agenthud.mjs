import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const value = process.env.AGENTHUD_BRIDGE_URL
if (!value) throw new Error('Set AGENTHUD_BRIDGE_URL to the HTTPS bridge base URL before packaging')
const url = new URL(value)
if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTPS URL with an optional path and no credentials, query or fragment')
const manifest = JSON.parse(await readFile('app.agenthud.json', 'utf8'))
manifest.permissions = [{ name: 'network', desc: 'Read fleet snapshots and record display observations through the paired bridge.', whitelist: [url.origin] }]
await mkdir('.agenthud-build', { recursive: true })
await writeFile('.agenthud-build/app.json', JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 })
const env = { ...process.env, VITE_BRIDGE_URL: url.href.replace(/\/$/, ''), VITE_AGENTHUD: '1' }
for (const [command, args] of [
  ['npm', ['run', 'build']],
  [resolve('node_modules/.bin/evenhub'), ['pack', '.agenthud-build/app.json', 'dist', '--sdk-ver', '0.0.14', '-o', 'agenthud-0.2.0.ehpk']],
]) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
