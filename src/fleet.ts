import { fetchFleet, fleetFrame, detailFrame, detailPages, transcriptPages, instructionPrompt, recordFrame, fitLine } from './lib/fleet'
import type { FleetSnapshot, FleetRecord, FrameObservation, TileFrame } from './lib/fleet'
import { isPaired, ask } from './lib/bridge'

type View = 'fleet' | 'detail' | 'compose' | 'review' | 'sending' | 'result'
export interface FleetCallbacks {
  onFrame(text: string, footer: string, title?: string): Promise<FrameObservation>
  onBack(): void
}

export class FleetView {
  active = true
  #snapshot?: FleetSnapshot
  #selected = 0
  #page = 0
  #view: View = 'fleet'
  #draft = ''
  #result = ''
  #loading = false
  #epoch = 0
  #queue: Promise<void> = Promise.resolve()
  #root: HTMLElement
  #callbacks: FleetCallbacks

  constructor(root: HTMLElement, callbacks: FleetCallbacks) {
    this.#root = root
    this.#callbacks = callbacks
    this.#phone()
    void this.refresh()
  }

  leave(): void {
    this.active = false
    this.#epoch++
    delete this.#root.dataset.snapshotId
    delete this.#root.dataset.renderReceipt
  }

  #record(): FleetRecord | undefined { return this.#snapshot?.records[this.#selected] }

  async refresh(): Promise<void> {
    if (!this.active || this.#loading || this.#view !== 'fleet') return
    this.#loading = true
    const epoch = this.#epoch
    try {
      const selectedId = this.#record()?.id
      const snapshot = await fetchFleet()
      if (!this.active || epoch !== this.#epoch) return
      this.#snapshot = snapshot
      const index = snapshot.records.findIndex(record => record.id === selectedId)
      this.#selected = index >= 0 ? index : Math.max(0, Math.min(this.#selected, snapshot.records.length - 1))
      this.#phone()
      await this.redraw()
    } catch (error) { this.#handleError(error) }
    finally { this.#loading = false }
  }

  movePage(delta: number): void {
    if (!this.active || !this.#snapshot || ['compose', 'sending'].includes(this.#view)) return
    if (this.#view === 'fleet') this.#selected = Math.max(0, Math.min(this.#selected + delta, this.#snapshot.records.length - 1))
    else this.#page = Math.max(0, Math.min(this.#page + delta, this.#pages() - 1))
    this.#epoch++
    this.#phone()
    void this.redraw()
  }

  tap(): void {
    if (!this.active || !this.#record()) return
    if (this.#view === 'fleet') { this.#view = 'detail'; this.#page = 0 }
    else if (this.#view === 'detail') { this.#view = 'compose'; this.#draft = ''; this.#page = 0 }
    else if (this.#view === 'compose') { if (!this.#draft.trim()) return; this.#view = 'review'; this.#page = 0 }
    else if (this.#view === 'review') {
      if (this.#page < this.#pages() - 1) { this.movePage(1); return }
      void this.#send(); return
    } else return
    this.#epoch++
    this.#phone()
    void this.redraw()
  }

  /** True delegates the root-level exit prompt to the host. */
  back(): boolean {
    if (this.#view === 'fleet') return true
    if (this.#view === 'sending') return false
    this.#view = this.#view === 'detail' ? 'fleet' : 'detail'
    this.#page = 0
    this.#epoch++
    this.#phone()
    void this.redraw()
    return false
  }

  #pages(): number {
    const record = this.#record()
    if (this.#view === 'detail' && record) return detailPages(record).length
    return transcriptPages(this.#view === 'result' ? this.#result : this.#draft).length
  }

  #frame(): TileFrame {
    if (this.#view === 'fleet') return fleetFrame(this.#snapshot!, this.#selected)
    const record = this.#record()!
    if (this.#view === 'detail') return detailFrame(record, this.#page)
    if (this.#view === 'compose') return { title: '', text: `Dictate on your phone\n\n${fitLine(record.name)}\n\nUse the keyboard microphone.\nYour words appear here.\n\nTap Review when ready.`, footer: 'double: cancel' }
    if (this.#view === 'sending') return { title: '', text: `Sending instruction\n\n${fitLine(record.name)}\n\nWaiting for the bridge…`, footer: 'Sending once' }
    const result = this.#view === 'result', pages = transcriptPages(result ? this.#result : this.#draft)
    const lines = pages[this.#page] ?? pages[0]
    return { title: '', text: [result ? 'Instruction response' : 'Review instruction', fitLine(record.name), '', ...lines].join('\n'), footer: fitLine(`${result ? 'double: detail' : this.#page < pages.length - 1 ? 'tap: read next' : 'tap: confirm send'}  ${this.#page + 1}/${pages.length}`) }
  }

  redraw(): Promise<void> {
    if (!this.#snapshot || !this.active) return Promise.resolve()
    const frame = this.#frame(), snapshot = this.#snapshot, view = this.#view, selected = this.#selected, page = this.#page
    this.#queue = this.#queue.then(async () => {
      if (!this.active) return
      const observation = await this.#callbacks.onFrame(frame.text, frame.footer, frame.title)
      if (!this.active) return
      // Lens headings distinguish Fleet, Agent detail and instruction review
      // within the shared display-observation endpoint.
      const id = await recordFrame(snapshot, 'fleet', observation)
      this.#root.dataset.snapshotId = snapshot.snapshot_id
      this.#root.dataset.renderReceipt = id
      this.#root.dataset.view = view
      this.#root.dataset.selected = String(selected)
      this.#root.dataset.page = String(page)
      console.info('AgentHUD frame', JSON.stringify({ receipt_id: id, view, selected, page }))
    }).catch(error => this.#handleError(error))
    return this.#queue
  }

  async #send(): Promise<void> {
    if (this.#view !== 'review' || !this.#draft.trim()) return
    const record = this.#record()!, words = this.#draft.trim()
    this.#view = 'sending'; this.#epoch++; this.#phone(); await this.redraw()
    try {
      const response = await ask(instructionPrompt(record, words))
      if (!this.active) return
      this.#result = response; this.#page = 0; this.#view = 'result'; this.#phone(); await this.redraw()
    } catch (error) {
      if (!this.active) return
      this.#result = error instanceof Error ? error.message : String(error)
      this.#view = 'result'; this.#page = 0; this.#phone(); this.#handleError(error)
      await this.redraw()
    }
  }

  #handleError(error: unknown): void {
    if (!this.active) return
    if (!isPaired()) { this.leave(); this.#callbacks.onBack(); return }
    const out = this.#root.querySelector('.fleet-status')
    if (out) out.textContent = error instanceof Error ? error.message : String(error)
  }

  #phone(): void {
    const card = document.createElement('div'); card.className = 'card'
    const heading = document.createElement('h1'); heading.textContent = 'AgentHUD'
    const status = document.createElement('p'); status.className = 'fleet-status status'
    const pre = document.createElement('pre'); pre.className = 'fleet-frame'
    if (this.#snapshot) { const frame = this.#frame(); pre.textContent = [frame.title, frame.text, frame.footer].filter(Boolean).join('\n') }
    card.append(heading, pre, status)
    const button = (label: string, action: () => void, disabled = false) => {
      const node = document.createElement('button'); node.textContent = label; node.disabled = disabled
      node.onclick = action; card.append(node)
    }
    if (this.#view === 'fleet') {
      button('Refresh fleet', () => { void this.refresh() })
      button('Open session', () => this.tap(), !this.#record())
    } else if (this.#view === 'detail') button('Dictate instruction', () => this.tap())
    else if (this.#view === 'compose') {
      const field = document.createElement('textarea'); field.className = 'prompt instruction'; field.placeholder = 'Dictate with your phone keyboard microphone'; field.value = this.#draft
      field.oninput = () => {
        this.#draft = field.value; pre.textContent = this.#draft
        // Preview the same words on the lens; sending always needs a later tap.
        const original = this.#view; this.#view = 'review'; this.#page = 0
        void this.redraw(); this.#view = original
      }
      card.append(field); button('Review instruction', () => this.tap()); setTimeout(() => field.focus(), 0)
    } else if (this.#view === 'review') button(this.#page < this.#pages() - 1 ? 'Read next' : 'Confirm send', () => this.tap())
    if (!['compose', 'sending'].includes(this.#view)) {
      const index = this.#view === 'fleet' ? this.#selected : this.#page
      const count = this.#view === 'fleet' ? this.#snapshot?.records.length ?? 0 : this.#pages()
      button('Previous page', () => this.movePage(-1), index <= 0)
      button('Next page', () => this.movePage(1), index >= count - 1)
    }
    if (this.#view !== 'fleet') button('Back', () => this.back(), this.#view === 'sending')
    button('Ask Claude', () => { this.leave(); this.#callbacks.onBack() }, this.#view === 'sending')
    this.#root.replaceChildren(card)
  }
}
