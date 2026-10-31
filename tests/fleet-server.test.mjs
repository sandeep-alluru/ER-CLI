import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('fleet reads and observations authenticate; Ask remains available; fleet mutation routes stay absent', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agenthud-http-'))
  process.env.G2_CLAUDE_CONFIG_DIR = join(dir, 'auth')
  const { createBridgeServer } = await import('../bridge/server.mjs')
  const { createFleetService } = await import('../bridge/fleet.mjs')
  const auth = await import('../bridge/auth.mjs')
  const snapshot = { schema_version: 1, snapshot_id: 'c'.repeat(64), records: [] }
  const fleet = createFleetService({ load: async () => snapshot, receiptDir: join(dir, 'receipts') })
  const server = createBridgeServer({ fleet, ask: async prompt => 'Answer: ' + prompt })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const request = (path, method = 'GET', body, token) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
  try {
    const preflight = await request('/fleet', 'OPTIONS')
    assert.equal(preflight.status, 204)
    assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/)
    assert.equal((await request('/fleet')).status, 401)
    assert.equal((await request('/fleet/render-receipts', 'POST', {})).status, 401)
    const { code } = auth.createPairingCode()
    const paired = await request('/pair', 'POST', { code, deviceName: 'test' })
    const { token } = await paired.json()
    const response = await request('/fleet', 'GET', undefined, token)
    assert.equal(response.status, 200)
    assert.equal((await response.json()).snapshot_id, snapshot.snapshot_id)
    const answer = await request('/ask', 'POST', { prompt: 'Hello' }, token)
    assert.equal(answer.status, 200)
    assert.equal((await answer.json()).text, 'Answer: Hello')
    for (const action of ['approve', 'instruct', 'pause', 'resume']) assert.equal((await request('/fleet/' + action, 'POST', {}, token)).status, 404)
    const [device] = await auth.listDevices()
    await auth.revokeDevice(device.id)
    assert.equal((await request('/fleet', 'GET', undefined, token)).status, 401)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await rm(dir, { recursive: true, force: true })
  }
})
