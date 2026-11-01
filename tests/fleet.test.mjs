import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { loadFleet, createFleetService } from '../bridge/fleet.mjs'

test('collector reads board states and existing artifacts without changing sources', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agenthud-source-'))
  try {
    const registry = join(dir, 'SESSIONS.md'), artifact = join(dir, 'output.txt')
    await writeFile(artifact, 'Produced output')
    const content = `| Session | State | Task | Transcript | Expected output | Decision |\n|---|---|---|---|---|---|\n| Build | ACTIVE | Compile | /missing/log | ${artifact} | |\n| Delivery | OUTPUT_READY | Export | /missing/other | /missing/output | |\n| Choice | NEEDS_DECISION | Select input | /missing/third | /missing/output | Choose input A or B |\n`
    await writeFile(registry, content)
    const config = join(dir, 'sources.json')
    await writeFile(config, JSON.stringify({ board_registry: registry }))
    const result = await loadFleet(config)
    assert.deepEqual(result.records.map(r => r.state), ['working', 'needs-decision'])
    assert.equal(result.records[1].pending_decision, 'Choose input A or B')
    assert.equal(result.records[0].last_artifact.name, 'output.txt')
    assert.equal(await readFile(registry, 'utf8'), content)
    await writeFile(config, JSON.stringify({ board_registry: registry, stale_after_seconds: -1 }))
    const older = await loadFleet(config)
    assert.deepEqual(older.records, [])
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('board state remains authoritative when transcript activity reports completion', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agenthud-lifecycle-'))
  try {
    const transcript = join(dir, 'session.jsonl'), registry = join(dir, 'SESSIONS.md'), config = join(dir, 'config.json')
    const timestamp = new Date().toISOString()
    await writeFile(transcript, [
      { timestamp, type: 'event_msg', payload: { type: 'task_started' } },
      { timestamp, type: 'event_msg', payload: { type: 'task_complete' } },
    ].map(x => JSON.stringify(x)).join('\n'))
    await writeFile(registry, `| Session | State | Task | Transcript |\n|---|---|---|---|\n| Build | ACTIVE | Build | ${transcript} |\n`)
    await writeFile(config, JSON.stringify({ board_registry: registry }))
    const snapshot = await loadFleet(config)
    assert.equal(snapshot.records[0].state, 'working')
    assert.equal(snapshot.records[0].source, 'board')
    assert.equal(snapshot.records[0].source_state, 'ACTIVE')
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('source configuration errors are explicit and malformed SSH targets are rejected', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agenthud-config-'))
  try {
    const config = join(dir, 'sources.json')
    await writeFile(config, JSON.stringify({ board_registry: join(dir, 'missing.md') }))
    await assert.rejects(loadFleet(config), /source read failed/)
    await writeFile(config, JSON.stringify({ ssh_target: '-oProxyCommand=bad' }))
    await assert.rejects(loadFleet(config), /Invalid SSH target/)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('only fresh board members appear, harness input is ignored, and each state group sorts newest first', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agenthud-current-'))
  try {
    const now = Date.now(), registry = join(dir, 'board.md'), config = join(dir, 'config.json')
    const entries = [['Old working', 'ACTIVE', 100], ['New parked', 'PARKED', 5], ['New working', 'ACTIVE', 2], ['Aged', 'ACTIVE', 1000], ['Closed', 'CLOSED', 1], ['Missing', 'MISSING', 1], ['Old parked', 'PARKED', 200]]
    let content = '| Session | State | Task | Transcript |\n|---|---|---|---|\n'
    for (const [name, state, seconds] of entries) {
      const log = join(dir, name + '.jsonl')
      await writeFile(log, JSON.stringify({ timestamp: new Date(now - seconds * 1000).toISOString(), type: 'event_msg', payload: { type: 'task_started' } }))
      content += `| ${name} | ${state} | Task | ${log} |\n`
    }
    await writeFile(registry, content)
    const ignored = join(dir, 'test-index.db')
    await writeFile(ignored, 'not a database; must never be read')
    await writeFile(config, JSON.stringify({ board_registry: registry, harness_index: ignored, stale_after_seconds: 900 }))
    const snapshot = await loadFleet(config)
    assert.deepEqual(snapshot.records.map(r => r.name), ['New working', 'Old working', 'New parked', 'Old parked'])
    assert.equal(snapshot.sources.length, 1)
    assert.equal(snapshot.sources[0].inspected_records, 7)
    assert.ok(snapshot.records.every(r => !r.source_stale && r.source === 'board'))
    assert.deepEqual(snapshot.source_errors, [])
    assert.equal(await readFile(registry, 'utf8'), content)
    assert.equal(await readFile(ignored, 'utf8'), 'not a database; must never be read')
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('concurrent reads share one source load and frame receipts preserve snapshot and content hash', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agenthud-receipt-'))
  try {
    let calls = 0
    const snapshot = { schema_version: 1, snapshot_id: 'a'.repeat(64), records: [] }
    const fleet = createFleetService({ receiptDir: dir, load: async () => { calls++; return snapshot } })
    await Promise.all(Array.from({ length: 12 }, () => fleet.get()))
    assert.equal(calls, 1)
    await assert.rejects(fleet.receipt({ snapshot_id: 'b'.repeat(64) }, 'test-device'), /Fetch/)
    const body = { snapshot_id: snapshot.snapshot_id, view: 'fleet', runtime: 'desktop', sdk_accepted: false, device_model: null, lines: ['AgentHUD fleet', 'Build WORK'] }
    const receipt = await fleet.receipt(body, 'test-device')
    assert.equal(receipt.frame_sha256, createHash('sha256').update(body.lines.join('\n')).digest('hex'))
    assert.equal(receipt.sdk_accepted, false)
    assert.equal(JSON.parse((await readFile(join(dir, 'renders.jsonl'), 'utf8')).trim()).snapshot_id, snapshot.snapshot_id)
    await assert.rejects(fleet.receipt({ ...body, lines: Array(11).fill('x') }, 'test-device'), /Invalid/)
  } finally { await rm(dir, { recursive: true, force: true }) }
})
