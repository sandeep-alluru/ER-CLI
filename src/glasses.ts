import {
  TextContainerProperty,
  CreateStartUpPageContainer,
  TextContainerUpgrade,
  ImageContainerProperty,
  ImageRawDataUpdate,
} from '@evenrealities/even_hub_sdk'
import { SCREEN_W, SCREEN_H, PADDING, BODY_LINES, wrapToWidth, paginate } from './lib/text'

type Bridge = Awaited<ReturnType<typeof import('@evenrealities/even_hub_sdk')['waitForEvenAppBridge']>>

const CONTAINER_ID = 1
const CONTAINER_NAME = 'main'

/**
 * Everything drawn on the lenses.
 *
 * One text container, redrawn via `textContainerUpgrade` — it updates in place
 * with no flicker, unlike rebuilding the page on every change. Long answers are
 * pre-paginated at real glyph widths and turned with the touchpad, because the
 * canvas uses a fixed number of lines per page.
 */
export class GlassesDisplay {
  #bridge: Bridge
  #pages: string[][] = [['']]
  #page = 0
  #footer = ''
  #tiles: boolean
  #lastTitle = ''

  constructor(bridge: Bridge, tiles = false) {
    this.#bridge = bridge
    this.#tiles = tiles
  }

  async start(initial: string): Promise<number> {
    this.#setBody(initial, 'double-tap to exit')
    return this.#bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: this.#tiles ? 5 : 1,
        ...(this.#tiles ? { imageObject: Array.from({ length: 4 }, (_, i) => new ImageContainerProperty({ xPosition: i * 144, yPosition: 30, width: 144, height: 54, containerID: i + 2, containerName: `title${i}`, zOrderIndex: i + 1 })) } : {}),
        textObject: [
          new TextContainerProperty({
            xPosition: 0,
            yPosition: 0,
            width: SCREEN_W,
            height: SCREEN_H,
            borderWidth: 0,
            borderColor: 5,
            paddingLength: PADDING,
            containerID: CONTAINER_ID,
            containerName: CONTAINER_NAME,
            content: this.#render(),
            isEventCapture: 1,
            ...(this.#tiles ? { zOrderIndex: 0 } : {}),
          }),
        ],
      }),
    )
  }

  #setBody(text: string, footer: string): void {
    this.#pages = paginate(wrapToWidth(text), BODY_LINES)
    this.#page = 0
    this.#footer = footer
  }

  #render(): string {
    const body = this.#pages[this.#page] ?? ['']
    const pager = this.#pages.length > 1 ? `  [${this.#page + 1}/${this.#pages.length}]` : ''
    // Pad to a fixed height so the footer sits on the same line every frame and
    // the text stays aligned across pages of different lengths.
    const padded = [...body, ...Array(Math.max(0, BODY_LINES - body.length)).fill('')]
    return [...padded, `${this.#footer}${pager}`].join('\n')
  }

  #push(): void {
    void this.#title('')
    this.#bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: CONTAINER_ID,
        containerName: CONTAINER_NAME,
        content: this.#render(),
      }),
    )
  }

  /** Replace what is on screen. */
  show(text: string, footer = 'double-tap to exit'): void {
    this.#setBody(text, footer)
    this.#push()
  }

  async showAndConfirm(text: string, footer: string, title = ''): Promise<{ lines: string[]; accepted: boolean }> {
    this.#setBody(text, footer)
    const content = this.#render()
    const accepted = await this.#bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: CONTAINER_ID,
      containerName: CONTAINER_NAME,
      content,
    }))
    const imageAccepted = await this.#title(title)
    return { lines: content.split('\n'), accepted: accepted === true && imageAccepted }
  }

  async #title(title: string): Promise<boolean> {
    if (!this.#tiles || title === this.#lastTitle) return true
    const canvas = document.createElement('canvas'); canvas.width = 576; canvas.height = 54
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, 576, 54)
    ctx.font = '600 36px sans-serif'; ctx.fillStyle = 'white'; ctx.textBaseline = 'middle'
    let fitted = title
    while (fitted && ctx.measureText(fitted + (fitted === title ? '' : '…')).width > 560) fitted = fitted.slice(0, -1)
    ctx.fillText(fitted + (fitted === title ? '' : '…'), 4, 27)
    for (let i = 0; i < 4; i++) {
      const rgba = ctx.getImageData(i * 144, 0, 144, 54).data
      const gray = Array.from({ length: 144 * 54 }, (_, n) => rgba[n * 4])
      const result = await this.#bridge.updateImageRawData(new ImageRawDataUpdate({ containerID: i + 2, containerName: `title${i}`, imageData: gray }))
      if (result !== 'success') return false
    }
    this.#lastTitle = title
    return true
  }

  /** Re-send the current frame, e.g. after returning to the foreground. */
  redraw(): void {
    this.#push()
  }

  /** Returns false when already at the end, so callers can ignore the gesture. */
  nextPage(): boolean {
    if (this.#page >= this.#pages.length - 1) return false
    this.#page += 1
    this.#push()
    return true
  }

  prevPage(): boolean {
    if (this.#page <= 0) return false
    this.#page -= 1
    this.#push()
    return true
  }
}
