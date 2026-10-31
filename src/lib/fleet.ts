import { getTextWidth } from '@evenrealities/pretext'
import { INNER_W, BODY_LINES } from './text'
import { post, unpair } from './bridge'

export type FleetState = 'working' | 'parked' | 'done' | 'failed' | 'needs-decision'
export interface FleetRecord {
  id: string
  name: string
  state: FleetState
  current_task: string
  last_artifact: { name: string; updated_at: string; bytes: number | null } | null
  last_output: string | null
  pending_decision: string | null
  updated_at: string | null
  source: string
  source_state: string
  source_stale: boolean
}
export interface FleetSnapshot {
  snapshot_id: string
  generated_at: string
  records: FleetRecord[]
  sources: { name: string; updated_at: string; records: number; stale?: boolean }[]
  source_errors: { source: string; error: string }[]
}
export interface FrameObservation {
  lines: string[]
  sdk_accepted: boolean
  runtime: 'desktop' | 'even-hub'
  device_model: 'g2' | null
}

async function fleetRequest(path: string, body: unknown, method = 'POST'): Promise<any> {
  try { return await post(path, body, true, method) }
  catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 401) await unpair()
    throw error
  }
}

export async function fetchFleet(): Promise<FleetSnapshot> {
  const result = await fleetRequest('/fleet', undefined, 'GET')
  if (!Array.isArray(result.records) || typeof result.snapshot_id !== 'string') throw new Error('Invalid fleet feed')
  return result
}

export async function recordFrame(snapshot: FleetSnapshot, view: 'fleet', observation: FrameObservation): Promise<string> {
  const result = await fleetRequest('/fleet/render-receipts', { snapshot_id: snapshot.snapshot_id, view, ...observation })
  return result.receipt.receipt_id
}

export function fitLine(value: string, width = INNER_W, prefix = '', suffix = ''): string {
  const single = value.replace(/[\r\n\t]/g, ' ')
  if (getTextWidth(prefix + single + suffix) <= width) return prefix + single + suffix
  let out = ''
  for (const char of single) {
    if (getTextWidth(prefix + out + char + '...' + suffix) > width) break
    out += char
  }
  return prefix + out + '...' + suffix
}

const labels: Record<FleetState, string> = {
  working: 'WORK', parked: 'PARK', done: 'DONE', failed: 'ERROR', 'needs-decision': 'NEEDS YOU',
}
export const FLEET_PAGE_SIZE = BODY_LINES - 1

export function fleetFrame(snapshot: FleetSnapshot, selected: number): { text: string; footer: string } {
  const count = snapshot.records.length
  const cursor = Math.max(0, Math.min(selected, count - 1))
  const page = Math.floor(cursor / FLEET_PAGE_SIZE)
  const lines = [fitLine(`AgentHUD fleet · ${count}`)]
  for (const [offset, record] of snapshot.records.slice(page * FLEET_PAGE_SIZE, (page + 1) * FLEET_PAGE_SIZE).entries()) {
    const marker = page * FLEET_PAGE_SIZE + offset === cursor ? '>' : ' '
    const suffix = ` ${labels[record.state]}${record.source_stale ? ' ~' : ''}`
    lines.push(fitLine(record.name, INNER_W, marker + ' ', suffix))
  }
  if (!count) lines.push('Fleet source connected · no sessions')
  return { text: lines.join('\n'), footer: fitLine(`tap: refresh · double: exit  ${page + 1}/${Math.max(1, Math.ceil(count / FLEET_PAGE_SIZE))}`) }
}
