import { readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const json = path => JSON.parse(readFileSync(path, 'utf8'))
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const build = json('docs/receipts/build.json')
for (const [path, digest] of Object.entries(build.source_sha256)) {
  assert.equal(hash(path), digest, `Source changed: ${path}`)
}
assert.equal(statSync(build.artifact.path).size, build.artifact.bytes)
assert.equal(hash(build.artifact.path), build.artifact.sha256)
const ask = json('docs/receipts/desktop-ask.json')
assert.equal(ask.result, 'success')
assert.equal(ask.response.length, ask.characters)
assert.ok(ask.elapsed_ms > 0 && Number.isFinite(ask.elapsed_ms))
assert.ok(ask.bridge_elapsed_ms > 0 && Number.isFinite(ask.bridge_elapsed_ms))
assert.equal(ask.environment, 'desktop browser')
let count = 0
for (const line of readFileSync('assets/SHA256SUMS', 'utf8').trim().split('\n')) {
  const match = line.match(/^([a-f0-9]{64})  (assets\/[\w.\/-]+)$/)
  assert.ok(match, 'Invalid checksum line')
  assert.equal(hash(match[2]), match[1], `Media changed: ${match[2]}`)
  count++
}
assert.ok(count >= 8)
console.log(`Verified source inputs, app package, desktop request and ${count} media files.`)
