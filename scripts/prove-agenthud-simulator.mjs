import { mkdir, readFile, writeFile, open } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer as createVite } from 'vite'
import assert from 'node:assert/strict'

const output = resolve(process.env.AGENTHUD_PROOF_DIR || '')
const target = process.env.AGENTHUD_PROOF_TARGET
if (!process.env.AGENTHUD_PROOF_DIR || !target || !/^[a-zA-Z0-9_.-]+$/.test(target)) throw Error('Set AGENTHUD_PROOF_DIR and AGENTHUD_PROOF_TARGET to an existing local tmux session')
execFileSync('tmux', ['has-session', '-t', target])
await mkdir(output, { recursive: true, mode: 0o700 })
assert.equal(await readFile(join(output, 'renders', 'renders.jsonl')).then(() => true, () => false), false, 'Use a fresh proof directory')
process.env.G2_CLAUDE_CONFIG_DIR = join(output, 'auth')
process.env.AGENTHUD_RECEIPT_DIR = join(output, 'renders')
process.env.VITE_AGENTHUD = '1'
const { createBridgeServer } = await import('../bridge/server.mjs')
const { createFleetService, loadFleet } = await import('../bridge/fleet.mjs')
const auth = await import('../bridge/auth.mjs')
const record = (name, value) => writeFile(join(output, name), JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const until = async (fn, timeout = 25000) => {
  const end = Date.now() + timeout
  let last
  while (Date.now() < end) { try { const v = await fn(); if (v) return v } catch (error) { last = error }; await pause(100) }
  throw Error('Proof wait timed out' + (last ? ': ' + last.message : ''))
}
const commands = [], pending = new Map()
let commandId = 0
const drive = code => new Promise((resolve, reject) => {
  const id = ++commandId
  const timer = setTimeout(() => { pending.delete(id); reject(Error('Webview driver timeout')) }, 25000)
  pending.set(id, value => { clearTimeout(timer); value.error ? reject(Error(value.error)) : resolve(value.result) })
  commands.push({ id, code })
})
const driver = `<script type="module">(async()=>{for(;;){try{const r=await fetch('/__proof/command');if(r.status===200){const c=await r.json();let result,error;try{result=await Object.getPrototypeOf(async function(){}).constructor(c.code)()}catch(e){error=String(e)}await fetch('/__proof/result',{method:'POST',body:JSON.stringify({id:c.id,result,error})})}}catch{}await new Promise(r=>setTimeout(r,50))}})()</script>`
let fleetReads = 0, asks = []
const fixtureBoard = join(output, 'fixture-board.md'), config = join(output, 'fixture-config.json')
// These are UI test cases, never the production feed or its portal-set proof.
const fixtureRows = [[target, 'ACTIVE', 'Continue the current app build'], ['Tile case B', 'ACTIVE', 'Compile the next package'], ['Tile case C', 'PARKED', 'Waiting for a review']]
let boardText = '| Session | State | Task | Transcript |\n|---|---|---|---|\n'
for (const [i, [name, state, task]] of fixtureRows.entries()) {
  const log = join(output, `fixture-activity-${i}.jsonl`)
  await writeFile(log, JSON.stringify({ timestamp: new Date(Date.now() - i * 1000).toISOString(), payload: { type: 'task_started' } }), { mode: 0o600 })
  boardText += `| ${name} | ${state} | ${task} | ${log} |\n`
}
await writeFile(fixtureBoard, boardText, { mode: 0o600 })
await writeFile(config, JSON.stringify({ board_registry: fixtureBoard, stale_after_seconds: 900 }), { mode: 0o600 })
const api = createBridgeServer({ fleet: createFleetService({ load: () => loadFleet(config) }) })
api.on('request', req => { if (req.url === '/fleet' && req.method === 'GET') fleetReads++; if (req.url === '/ask' && req.method === 'POST') asks.push({ observed_at: new Date().toISOString() }) })
let vite, simulator, log, phase = 'startup'
const events = [], started = new Date().toISOString()
const port = Number(process.env.AGENTHUD_SIM_PORT || 9898), simBase = `http://127.0.0.1:${port}`
async function frames() { try { return (await readFile(join(output, 'renders', 'renders.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse) } catch { return [] } }
async function latest() { return (await frames()).at(-1) }
async function capture(label) {
  const response = await fetch(simBase + '/api/screenshot/glasses'); assert.ok(response.ok)
  const bytes = Buffer.from(await response.arrayBuffer()); await writeFile(join(output, label + '.png'), bytes, { mode: 0o600 })
  const frame = await latest(); events.push({ label, receipt_id: frame?.receipt_id, lines: frame?.lines, screenshot_sha256: createHash('sha256').update(bytes).digest('hex') })
}
async function input(action, match) {
  const previous = (await latest())?.receipt_id
  await fetch(simBase + '/api/input', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
  return until(async () => { const frame = await latest(); return frame?.receipt_id !== previous && (!match || frame.lines.join('\n').includes(match)) ? frame : null })
}
try {
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve))
  const bridgeUrl = `http://127.0.0.1:${api.address().port}`
  process.env.VITE_BRIDGE_URL = bridgeUrl
  vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'local-simulator-proof-driver', transformIndexHtml: html => html.replace('</body>', driver + '</body>'), configureServer(server) {
    server.middlewares.use('/__proof/command', (req, res) => { const c = commands.shift(); res.statusCode = c ? 200 : 204; res.end(c ? JSON.stringify(c) : '') })
    server.middlewares.use('/__proof/result', (req, res) => { let data = ''; req.on('data', c => { data += c }); req.on('end', () => { const value = JSON.parse(data); pending.get(value.id)?.(value); pending.delete(value.id); res.end('ok') }) })
  } }] })
  await vite.listen()
  log = await open(join(output, 'simulator.log'), 'w', 0o600)
  simulator = spawn('xvfb-run', ['-a', resolve('node_modules/@evenrealities/sim-linux-x64/bin/evenhub-simulator'), '--no-glow', '--automation-port', String(port), `http://127.0.0.1:${vite.httpServer.address().port}`], { detached: true, stdio: ['ignore', log.fd, log.fd], env: { ...process.env, WEBKIT_DISABLE_COMPOSITING_MODE: '1', WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS: '1' } })
  await until(async () => (await fetch(simBase + '/api/ping')).ok)
  await pause(4000)
  await drive(`if(!document.querySelector('input.code'))throw Error('Pair screen not ready'); return true`)
  const { code } = auth.createPairingCode()
  await drive(`const i=document.querySelector('input.code');i.type='password';i.value=${JSON.stringify(code)};[...document.querySelectorAll('button')].find(b=>b.textContent==='Pair this phone').click();return true`)
  await until(latest, 45000)
  assert.ok((await latest()).sdk_accepted, 'Simulator must acknowledge native text and images')
  phase = 'tile'
  await capture('01-fleet-tile')
  const initialReads = fleetReads
  const first = await latest()
  phase = 'scroll'
  await input('down', 'Tile case B'); await capture('02-next-tile')
  await input('down', 'Tile case C'); await capture('03-next-tile')
  await input('up', 'Tile case B'); await capture('04-previous-tile')
  await input('up', target); await capture('05-target-tile')
  await pause(16000)
  assert.equal(fleetReads, initialReads, 'No interval or gesture-triggered source refresh')
  assert.equal((await latest()).lines.join('\n'), first.lines.join('\n'), 'Page remains steady beyond old poll interval')
  phase = 'tap-detail'
  await input('click', 'Agent detail'); await capture('06-tap-detail')
  await input('double_click', 'AgentHUD · Fleet'); await capture('07-double-back')
  await input('click', 'Agent detail')
  await input('click', 'Dictate on your phone'); await capture('08-compose')
  phase = 'voice-review'
  const words = `AgentHUD voice delivery proof ${new Date().toISOString()}. Acknowledge receipt only and continue the current AgentHUD task.`
  await record('instruction.json', { text: words, input: 'Simulator transcript injection through the existing phone textarea; literal microphone pending', target })
  const old = (await latest()).receipt_id
  await drive(`const field=document.querySelector('textarea.instruction');field.value=${JSON.stringify(words)};field.dispatchEvent(new Event('input',{bubbles:true}));return true`)
  await until(async () => (await latest())?.receipt_id !== old)
  await capture('09-transcript-preview')
  assert.equal(asks.length, 0, 'Preview cannot send')
  await drive(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Review instruction').click();return true`)
  await until(async () => (await latest())?.receipt_id !== old && (await latest()).lines.join('\n').includes('confirm send'))
  await capture('10-confirmation')
  assert.equal(asks.length, 0, 'Review cannot send')
  phase = 'voice-send'
  await input('click', 'Sending instruction'); await capture('11-send-confirmed')
  await until(async () => (await latest())?.lines[0] === 'Instruction response', 195000)
  await capture('12-instruction-response')
  assert.equal(asks.length, 1, 'Exactly one confirmed send')
  const consoleResponse = await fetch(simBase + '/api/console'); await record('console.json', await consoleResponse.json())
  const all = await frames()
  await record('simulator-receipt.json', { started_at: started, completed_at: new Date().toISOString(), runtime: 'official-evenhub-simulator', simulator_version: '0.9.5', source: 'Local UI fixture; production before/after recorded separately', frames: all.length, sdk_accepted: all.every(f=>f.sdk_accepted), fleet_reads: fleetReads, confirmed_sends: asks.length, events, physical_microphone: 'pending', receiving_transcript: 'Verify independently against instruction.json before claiming delivery' })
  console.log(JSON.stringify({ frames: all.length, fleet_reads: fleetReads, confirmed_sends: asks.length, output }))
} catch (error) {
  await record('blocker.json', { phase, observed_at: new Date().toISOString(), error: error.message })
  await record('partial-receipt.json', { started_at: started, events, frames: (await frames()).length, fleet_reads: fleetReads, confirmed_sends: asks.length })
  throw error
} finally {
  if (simulator) { try { process.kill(-simulator.pid, 'SIGTERM') } catch {} }
  for (const device of await auth.listDevices()) await auth.revokeDevice(device.id)
  if (vite) await vite.close()
  await new Promise(resolve => api.close(resolve))
  await log?.close()
}
