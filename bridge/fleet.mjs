import { execFile } from 'node:child_process'
import { readFile, mkdir, appendFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'

const collectorPath = fileURLToPath(new URL('./collect_fleet.py', import.meta.url))
const states = new Set(['working', 'parked', 'done', 'failed', 'needs-decision'])
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'"

export async function loadFleet(configPath = process.env.AGENTHUD_FLEET_CONFIG) {
  if (!configPath) throw new Error('Set AGENTHUD_FLEET_CONFIG to a private source configuration file')
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  let command = 'python3', args = [collectorPath]
  if (config.ssh_target) {
    if (!/^[a-zA-Z0-9_.@:-]+$/.test(config.ssh_target) || config.ssh_target.startsWith('-')) throw new Error('Invalid SSH target')
    const program = await readFile(collectorPath, 'utf8')
    command = 'ssh'
    args = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', config.ssh_target, 'python3 -c ' + quote(program)]
  }
  const data = await new Promise((resolve, reject) => {
    const child = execFile(command, args, { timeout: 20_000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => {
      if (error) return reject(new Error('Fleet source read failed; check configured sources and SSH access'))
      try { resolve(JSON.parse(stdout)) } catch { reject(new Error('Fleet source returned invalid JSON')) }
    })
    child.stdin.end(JSON.stringify(config))
  })
  if (data.schema_version !== 1 || !/^[a-f0-9]{64}$/.test(data.snapshot_id) || !Array.isArray(data.records)) throw new Error('Invalid fleet snapshot')
  if (!data.records.every(r => typeof r.id === 'string' && typeof r.name === 'string' && states.has(r.state))) throw new Error('Invalid fleet record')
  return data
}

export function createFleetService({ load = loadFleet, receiptDir = process.env.AGENTHUD_RECEIPT_DIR ?? join(homedir(), '.config', 'agenthud', 'receipts') } = {}) {
  let current, loadedAt = 0, pending
  const snapshots = new Map()
  return {
    async get() {
      if (current && Date.now() - loadedAt < 5000) return current
      if (!pending) pending = load().then(data => {
        current = data; loadedAt = Date.now(); snapshots.set(data.snapshot_id, data)
        while (snapshots.size > 10) snapshots.delete(snapshots.keys().next().value)
        return data
      }).finally(() => { pending = undefined })
      return pending
    },
    async receipt(body, deviceId, transport = {}) {
      if (!body || !snapshots.has(body.snapshot_id)) throw new Error('Fetch the fleet snapshot before recording its render')
      if (body.view !== 'fleet' || !Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 10 || !body.lines.every(s => typeof s === 'string' && s.length <= 300)) throw new Error('Invalid rendered frame')
      if (typeof body.sdk_accepted !== 'boolean' || !['desktop', 'even-hub'].includes(body.runtime)) throw new Error('Invalid SDK observation')
      const content = body.lines.join('\n')
      const receipt = {
        receipt_id: randomUUID(), received_at: new Date().toISOString(),
        snapshot_id: body.snapshot_id, device_id: deviceId,
        view: body.view, runtime: body.runtime,
        device_model: body.device_model === 'g2' ? 'g2' : null,
        sdk_accepted: body.sdk_accepted,
        frame_sha256: createHash('sha256').update(content).digest('hex'),
        lines: body.lines,
        observed_transport: transport,
      }
      await mkdir(receiptDir, { recursive: true, mode: 0o700 })
      await appendFile(join(receiptDir, 'renders.jsonl'), JSON.stringify(receipt) + '\n', { mode: 0o600 })
      return receipt
    },
  }
}
