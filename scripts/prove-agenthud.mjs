import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'
import { createServer as createViteServer } from 'vite'
import assert from 'node:assert/strict'
import { getTextWidth } from '@evenrealities/pretext'

if (!process.env.AGENTHUD_FLEET_CONFIG || !process.env.AGENTHUD_PROOF_DIR) throw new Error('Set AGENTHUD_FLEET_CONFIG and AGENTHUD_PROOF_DIR')
const output = resolve(process.env.AGENTHUD_PROOF_DIR)
await mkdir(output, { recursive: true, mode: 0o700 })
process.env.G2_CLAUDE_CONFIG_DIR = await mkdtemp(join(output, 'auth-'))
process.env.AGENTHUD_RECEIPT_DIR = join(output, 'renders')
process.env.VITE_AGENTHUD = '1'
const { createBridgeServer } = await import('../bridge/server.mjs')
const auth = await import('../bridge/auth.mjs')
const server = createBridgeServer()
let browser, vite, phase = 'source-read'
const started = new Date().toISOString()
const record = async (name, data) => writeFile(join(output, name), JSON.stringify(data, null, 2) + '\n', { mode: 0o600 })
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const bridgeUrl = `http://127.0.0.1:${server.address().port}`
  process.env.VITE_BRIDGE_URL = bridgeUrl
  vite = await createViteServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' })
  await vite.listen()
  const appUrl = `http://127.0.0.1:${vite.httpServer.address().port}`
  browser = await chromium.launch({ headless: true, ...(process.env.AGENTHUD_BROWSER_EXECUTABLE ? { executablePath: process.env.AGENTHUD_BROWSER_EXECUTABLE } : {}) })
  const page = await browser.newPage({ viewport: { width: 520, height: 950 } })
  const errors = [], reads = []
  let observedSnapshot
  const snapshots = new Map()
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    if (response.url() === bridgeUrl + '/fleet' && response.status() === 200) reads.push(response.json().then(data => { observedSnapshot = data; snapshots.set(data.snapshot_id, data) }))
  })
  await page.goto(appUrl)
  await page.getByRole('button', { name: 'Pair this phone' }).waitFor({ timeout: 20_000 })
  await page.getByText('Bridge address', { exact: true }).click()
  await page.locator('input.url').fill(bridgeUrl)
  await page.getByRole('button', { name: 'Save & test' }).click()
  await page.getByText('Reachable: ' + bridgeUrl, { exact: true }).waitFor()
  const { code } = auth.createPairingCode()
  await page.locator('input.code').evaluate(input => { input.type = 'password' })
  await page.locator('input.code').fill(code)
  await page.getByRole('button', { name: 'Pair this phone' }).click()
  phase = 'phone-view'
  await page.locator('.fleet-frame').waitFor()
  await page.waitForFunction(() => document.getElementById('app')?.dataset.renderReceipt, null, { timeout: 40_000 })
  await Promise.all(reads)
  assert.ok(observedSnapshot)
  await record('served-feed.json', observedSnapshot)
  const firstReceipt = await page.locator('#app').getAttribute('data-render-receipt')
  await page.screenshot({ path: join(output, 'phone-fleet.png') })
  const firstFrame = await page.locator('.fleet-frame').innerText()
  phase = 'page-navigation'
  if (observedSnapshot.records.length > 8) {
    await page.getByRole('button', { name: 'Next page' }).click()
    await page.waitForFunction(id => document.getElementById('app')?.dataset.renderReceipt !== id, firstReceipt)
    assert.notEqual(await page.locator('.fleet-frame').innerText(), firstFrame)
    await page.getByRole('button', { name: 'Previous page' }).click()
    await page.waitForFunction(text => document.querySelector('.fleet-frame')?.textContent === text, firstFrame)
  }
  phase = 'existing-ask'
  await page.getByRole('button', { name: 'Ask Claude', exact: true }).click()
  await page.locator('textarea.prompt').fill('Return exactly these words as plain text: AgentHUD Ask connection.')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await page.getByText(/Answered in/).waitFor({ timeout: 195_000 })
  const answer = await page.locator('pre.answer').innerText()
  assert.ok(answer.length > 5)
  await record('ask-response.json', { scope: 'Real installed Claude CLI', text: answer, observed_at: new Date().toISOString() })
  phase = 'revoked-device'
  await page.getByRole('button', { name: 'Open AgentHUD fleet' }).click()
  await page.locator('.fleet-frame').waitFor()
  for (const device of await auth.listDevices()) await auth.revokeDevice(device.id)
  await page.getByRole('button', { name: 'Refresh fleet' }).click()
  await page.getByRole('button', { name: 'Pair this phone' }).waitFor()
  const renderLines = (await readFile(join(output, 'renders', 'renders.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line))
  assert.ok(renderLines.length >= 1)
  assert.ok(renderLines.every(frame => snapshots.has(frame.snapshot_id)))
  assert.ok(renderLines.every(frame => frame.lines.length <= 10))
  const layout = await vite.ssrLoadModule('/src/lib/text.ts')
  const maxWidth = Math.max(...renderLines.flatMap(frame => frame.lines.map(line => getTextWidth(line))))
  assert.ok(maxWidth <= layout.INNER_W)
  assert.equal(errors.length, 0, errors.join('\n'))
  const summary = {
    schema_version: 1, observation_kind: 'desktop_transport',
    started_at: started, completed_at: new Date().toISOString(),
    snapshot_id: observedSnapshot.snapshot_id, records: observedSnapshot.records.length,
    records_sha256: createHash('sha256').update(JSON.stringify(observedSnapshot.records)).digest('hex'),
    source_counts: observedSnapshot.sources.map(s => ({ name: s.name, records: s.records, updated_at: s.updated_at })),
    stale_records: observedSnapshot.records.filter(r => r.source_stale).length,
    layout: { screen_width_px: layout.SCREEN_W, screen_height_px: layout.SCREEN_H, text_width_px: layout.INNER_W, body_lines: layout.BODY_LINES, max_observed_line_width_px: maxWidth },
    frames: renderLines.map(({ snapshot_id, frame_sha256, received_at, sdk_accepted, runtime, device_model, lines }) => ({ snapshot_id, frame_sha256, received_at, sdk_accepted, runtime, device_model, line_count: lines.length })),
    phone_navigation: 'next and previous pages exercised',
    existing_ask: 'real Claude CLI response received', browser_page_errors: errors.length,
    revoked_device: 'returns to pairing',
    physical_observation: null,
  }
  await record('transport-receipt.json', summary)
  console.log(JSON.stringify(summary, null, 2))
} catch (error) {
  await record('blocker.json', { observed_at: new Date().toISOString(), phase, error: error.message })
  throw error
} finally {
  for (const device of await auth.listDevices()) await auth.revokeDevice(device.id)
  if (browser) await browser.close()
  if (vite) await vite.close()
  await new Promise(resolve => server.close(resolve))
}
