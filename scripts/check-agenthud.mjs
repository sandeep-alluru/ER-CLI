import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const receipt = JSON.parse(await readFile('docs/receipts/agenthud-transport.json', 'utf8'))
assert.ok(['desktop_transport', 'official_simulator'].includes(receipt.observation_kind))
assert.equal(receipt.physical_observation, null)
assert.ok(Number.isInteger(receipt.records) && receipt.records >= 0)
assert.equal(receipt.source_counts.reduce((n, source) => n + source.records, 0), receipt.records)
assert.ok(receipt.frames.length > 0)
assert.equal(receipt.browser_page_errors, 0)
assert.ok(receipt.layout.max_observed_line_width_px <= receipt.layout.text_width_px)
for (const frame of receipt.frames) {
  assert.match(frame.snapshot_id, /^[a-f0-9]{64}$/)
  assert.match(frame.frame_sha256, /^[a-f0-9]{64}$/)
  assert.ok(frame.line_count <= receipt.layout.body_lines + 1)
  assert.equal(frame.runtime, receipt.observation_kind === 'official_simulator' ? 'even-hub' : 'desktop')
  assert.equal(frame.device_model, receipt.observation_kind === 'official_simulator' ? 'g2' : null)
  if (receipt.observation_kind === 'official_simulator') assert.equal(frame.sdk_accepted, true)
}
for (const [path, digest] of Object.entries(receipt.source_sha256)) {
  assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'), digest, `Source fingerprint changed: ${path}`)
}
console.log(`Verified ${receipt.records} observed source records, ${receipt.frames.length} ${receipt.observation_kind} frames and source fingerprints.`)
