import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { getTextWidth } from '@evenrealities/pretext'

test('fleet pages keep one record per physical line within the measured HUD width', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { fleetFrame, FLEET_PAGE_SIZE } = await vite.ssrLoadModule('/src/lib/fleet.ts')
    const states = ['working', 'parked', 'done', 'failed', 'needs-decision']
    const records = Array.from({ length: 25 }, (_, i) => ({ id: String(i), name: 'Long session title '.repeat(12) + i, state: states[i % states.length], source_stale: i % 2 === 0 }))
    assert.equal(FLEET_PAGE_SIZE, 8)
    const snapshot = { records }
    for (let selected = 0; selected < records.length; selected += 8) {
      const frame = fleetFrame(snapshot, selected)
      const lines = frame.text.split('\n')
      assert.ok(lines.length <= 9)
      assert.equal(lines.length - 1, Math.min(8, records.length - selected))
      for (const line of [...lines, frame.footer]) assert.ok(getTextWidth(line) <= 568, line)
    }
    assert.match(fleetFrame({ records: [] }, 0).text, /no sessions/)
  } finally { await vite.close() }
})
