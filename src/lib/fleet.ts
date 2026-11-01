import { getTextWidth } from '@evenrealities/pretext'
import { INNER_W, wrapToWidth, paginate } from './text'
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
  working: 'Working', parked: 'Parked', done: 'Done', failed: 'Needs attention', 'needs-decision': 'Needs you',
}
export const FLEET_PAGE_SIZE = 1
export interface TileFrame { text: string; footer: string; title: string }

export function fleetFrame(snapshot: FleetSnapshot, selected: number): TileFrame {
  const count = snapshot.records.length
  if (!count) return { title: '', text: 'AgentHUD\n\nNo current sessions\n\nRefresh from your phone.', footer: 'double: exit' }
  const cursor = Math.max(0, Math.min(selected, count - 1)), record = snapshot.records[cursor]
  return {
    title: record.name,
    text: ['AgentHUD · Fleet', '', '', labels[record.state], '', fitLine(record.pending_decision || record.current_task || 'Ready for the next task'), '', '', 'tap: open · scroll: change'].join('\n'),
    footer: fitLine(record.name, INNER_W, `${cursor + 1}/${count} · `),
  }
}

export function detailPages(record: FleetRecord): string[][] {
  return paginate(wrapToWidth([
    record.pending_decision || record.current_task || 'Ready for the next task',
    record.last_output ? `Latest: ${record.last_output}` : '',
    record.last_artifact ? `Artifact: ${record.last_artifact.name}` : '',
    record.updated_at ? `Activity: ${new Date(record.updated_at).toISOString()}` : '',
  ].filter(Boolean).join('\n')), 3)
}

export function detailFrame(record: FleetRecord, page: number): TileFrame {
  const pages = detailPages(record), index = Math.max(0, Math.min(page, pages.length - 1))
  return { title: record.name, text: ['Agent detail', '', '', labels[record.state], '', ...pages[index], ...Array(3 - pages[index].length).fill(''), 'tap: dictate on phone'].join('\n'), footer: fitLine(`scroll: read · double: fleet  ${index + 1}/${pages.length}`) }
}

export function transcriptPages(text: string): string[][] { return paginate(wrapToWidth(text), 5) }

export function instructionPrompt(record: FleetRecord, words: string): string {
  return `Deliver this confirmed instruction to the EXISTING LOCAL session named ${JSON.stringify(record.name)} using its existing input interface. First check that exact local tmux session. Do not start a replacement session, contact another machine, edit files, or execute the instruction yourself. If a tool or hook rejects a call, stop immediately and report the exact error; do not work around it or investigate unrelated files/services. Verify delivery in the receiving session's own transcript and report its path and the exact matching text. If no such local session/interface is available, report that; do not claim delivery.\nInstruction (verbatim):\n${words}`
}
