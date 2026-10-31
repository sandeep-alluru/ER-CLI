import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

if (!process.argv[2]) throw new Error('Pass the private transport-receipt.json produced by prove-agenthud.mjs')
const receipt = JSON.parse(await readFile(process.argv[2], 'utf8'))
assert.equal(receipt.observation_kind, 'desktop_transport')
assert.equal(receipt.physical_observation, null)
const files = ['app.json', 'app.agenthud.json', 'package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'tsconfig.json']
for (const dir of ['bridge', 'src', 'scripts', 'tests']) {
  for (const entry of await readdir(dir, { recursive: true })) if (/\.(?:mjs|py|ts)$/.test(entry)) files.push(join(dir, entry))
}
receipt.source_sha256 = {}
for (const path of files.sort()) receipt.source_sha256[path] = createHash('sha256').update(await readFile(path)).digest('hex')
await writeFile('docs/receipts/agenthud-transport.json', JSON.stringify(receipt, null, 2) + '\n')
console.log('Wrote a redacted transport receipt; private session contents stay in the proof directory.')
