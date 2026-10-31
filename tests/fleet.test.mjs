import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
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
    assert.deepEqual(result.records.map(r => r.state), ['needs-decision', 'working', 'done'])
    assert.equal(result.records[0].pending_decision, 'Choose input A or B')
    assert.equal(result.records[1].last_artifact.name, 'output.txt')
    assert.equal(result.records[2].last_artifact, null)
    assert.equal(await readFile(registry, 'utf8'), content)
    await writeFile(config, JSON.stringify({ board_registry: registry, stale_after_seconds: -1 }))
    const older = await loadFleet(config)
    assert.equal(older.records.find(r => r.name === 'Build').state, 'working')
    assert.equal(older.records.find(r => r.name === 'Build').source_stale, true)
    assert.equal(older.records.find(r => r.name === 'Build').source_state, 'ACTIVE')
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('explicit transcript completion supersedes a board ACTIVE claim without treating metadata age as a new state', async () => {
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
    assert.equal(snapshot.records[0].state, 'parked')
    assert.equal(snapshot.records[0].source, 'board+harness')
    assert.equal(snapshot.records[0].source_state, 'task_complete')
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

test('harness lifecycle data is read from SQLite in read-only mode and partial source errors stay visible', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agenthud-harness-'))
  try {
    const database = join(dir, 'index.db'), log = join(dir, 'events.jsonl'), config = join(dir, 'config.json')
    await writeFile(log, JSON.stringify({ payload: { event: { kind: 'terminal', terminal: 'failed', reason: 'Provider request ended' } } }))
    execFileSync('python3', ['-c', 'import sqlite3,sys,time; c=sqlite3.connect(sys.argv[1]); c.execute("create table sessions(session_id, session_name, title, session_log_path, updated_at_us)"); c.execute("insert into sessions values(?,?,?,?,?)", ("sample-session", "Sample", "Read report", sys.argv[2], int(time.time()*1000000))); c.commit(); c.close()', database, log])
    const before = createHash('sha256').update(await readFile(database)).digest('hex')
    await writeFile(config, JSON.stringify({ harness_index: database, board_registry: join(dir, 'missing-board.md') }))
    const snapshot = await loadFleet(config)
    assert.equal(snapshot.records[0].state, 'failed')
    assert.equal(snapshot.records[0].last_output, 'Provider request ended')
    assert.equal(snapshot.source_errors[0].source, 'board')
    assert.equal(createHash('sha256').update(await readFile(database)).digest('hex'), before)
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
