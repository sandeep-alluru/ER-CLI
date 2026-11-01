import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { getTextWidth } from '@evenrealities/pretext'

test('one-session tiles and detail pages fit the lens, with complete paginated instruction review', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { fleetFrame, detailFrame, detailPages, transcriptPages, FLEET_PAGE_SIZE } = await vite.ssrLoadModule('/src/lib/fleet.ts')
    const record = { id: 'sample', name: 'Long session title '.repeat(12), state: 'working', current_task: 'A long task sentence '.repeat(35), pending_decision: null, last_output: 'Output '.repeat(70), updated_at: new Date().toISOString() }
    assert.equal(FLEET_PAGE_SIZE, 1)
    const frames = [fleetFrame({ records: [record] }, 0), fleetFrame({ records: [] }, 0), ...detailPages(record).map((_, i) => detailFrame(record, i))]
    for (const frame of frames) {
      const lines = frame.text.split('\n')
      assert.ok(lines.length <= 9)
      assert.ok((frame.text + frame.footer).length <= 500)
      for (const line of [...lines, frame.footer]) assert.ok(getTextWidth(line) <= 568, line)
    }
    assert.match(frames[0].text, /Working/)
    assert.match(frames[1].text, /No current sessions/)
    const words = 'Confirm the next build after reading the report. '.repeat(20).trim()
    assert.equal(transcriptPages(words).flat().join(' '), words)
  } finally { await vite.close() }
})

test('empty envelopes imply tap only inside envelopes; scroll, lifecycle and audio never become refresh or tap', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { gestureOf } = await vite.ssrLoadModule('/src/lib/gestures.ts')
    const { OsEventTypeList: E } = await import('@evenrealities/even_hub_sdk')
    assert.equal(gestureOf({ sysEvent: {} }), 'tap')
    assert.equal(gestureOf({}), null)
    assert.equal(gestureOf({ audioEvent: {} }), null)
    assert.equal(gestureOf({ sysEvent: {}, textEvent: { eventType: E.SCROLL_BOTTOM_EVENT } }), 'next')
    assert.equal(gestureOf({ textEvent: { eventType: E.SCROLL_TOP_EVENT } }), 'previous')
    assert.equal(gestureOf({ sysEvent: { eventType: E.FOREGROUND_ENTER_EVENT } }), 'foreground')
    assert.equal(gestureOf({ sysEvent: { eventType: E.DOUBLE_CLICK_EVENT }, textEvent: {} }), 'back')
  } finally { await vite.close() }
})
