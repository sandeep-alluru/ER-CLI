import { fetchFleet, fleetFrame, recordFrame, FLEET_PAGE_SIZE } from './lib/fleet'
import type { FleetSnapshot, FrameObservation } from './lib/fleet'
import { isPaired } from './lib/bridge'

export interface FleetCallbacks {
  onFrame(text: string, footer: string): Promise<FrameObservation>
  onBack(): void
}

export class FleetView {
  active = true
  #snapshot?: FleetSnapshot
  #selected = 0
  #generation = 0
  #timer: ReturnType<typeof setInterval>
  #root: HTMLElement
  #callbacks: FleetCallbacks
  #status = document.createElement('p')
  #frame = document.createElement('pre')
  #previous = document.createElement('button')
  #next = document.createElement('button')

  constructor(root: HTMLElement, callbacks: FleetCallbacks) {
    this.#root = root
    this.#callbacks = callbacks
    const card = document.createElement('div')
    card.className = 'card'
    const heading = document.createElement('h1')
    heading.textContent = 'AgentHUD'
    this.#frame.className = 'fleet-frame'
    const refresh = document.createElement('button')
    refresh.textContent = 'Refresh fleet'
    refresh.onclick = () => { void this.refresh() }
    this.#previous.textContent = 'Previous page'
    this.#previous.onclick = () => this.movePage(-1)
    this.#next.textContent = 'Next page'
    this.#next.onclick = () => this.movePage(1)
    const back = document.createElement('button')
    back.textContent = 'Ask Claude'
    back.onclick = () => { this.leave(); callbacks.onBack() }
    card.append(heading, refresh, this.#previous, this.#next, this.#status, this.#frame, back)
    root.replaceChildren(card)
    this.#timer = setInterval(() => { void this.refresh() }, 15_000)
    void this.refresh()
  }

  leave(): void {
    this.active = false
    this.#generation++
    clearInterval(this.#timer)
    delete this.#root.dataset.snapshotId
    delete this.#root.dataset.renderReceipt
  }

  async refresh(): Promise<void> {
    if (!this.active) return
    const generation = ++this.#generation
    this.#status.textContent = 'Reading fleet…'
    try {
      const snapshot = await fetchFleet()
      if (!this.active || generation !== this.#generation) return
      this.#snapshot = snapshot
      this.#selected = Math.min(this.#selected, Math.max(0, snapshot.records.length - 1))
      await this.#render(generation)
    } catch (error) {
      if (this.active && generation === this.#generation) this.#handleError(error)
    }
  }

  movePage(delta: number): void {
    if (!this.active || !this.#snapshot) return
    const count = this.#snapshot.records.length
    const page = Math.floor(this.#selected / FLEET_PAGE_SIZE)
    this.#selected = Math.max(0, Math.min(page + delta, Math.max(0, Math.ceil(count / FLEET_PAGE_SIZE) - 1))) * FLEET_PAGE_SIZE
    void this.#render(++this.#generation).catch(error => { if (this.active) this.#handleError(error) })
  }

  #handleError(error: unknown): void {
    if (!isPaired()) { this.leave(); this.#callbacks.onBack(); return }
    this.#status.textContent = error instanceof Error ? error.message : String(error)
  }

  async #render(generation: number): Promise<void> {
    const snapshot = this.#snapshot!
    const frame = fleetFrame(snapshot, this.#selected)
    this.#frame.textContent = frame.text + '\n\n' + frame.footer
    this.#root.dataset.snapshotId = snapshot.snapshot_id
    const page = Math.floor(this.#selected / FLEET_PAGE_SIZE)
    this.#previous.disabled = page === 0
    this.#next.disabled = (page + 1) * FLEET_PAGE_SIZE >= snapshot.records.length
    const observation = await this.#callbacks.onFrame(frame.text, frame.footer)
    if (!this.active || generation !== this.#generation) return
    const id = await recordFrame(snapshot, 'fleet', observation)
    if (!this.active || generation !== this.#generation) return
    this.#root.dataset.renderReceipt = id
    const older = snapshot.records.filter(record => record.source_stale).length
    this.#status.textContent = `${snapshot.records.length} sessions · read ${new Date(snapshot.generated_at).toLocaleTimeString()} · ${observation.runtime === 'desktop' ? 'Desktop view' : observation.sdk_accepted ? 'Display acknowledged' : 'Display connection pending'}${older ? ` · ~ ${older} earlier source snapshots` : ''}${snapshot.source_errors.length ? ' · Check source configuration' : ''}`
  }
}
