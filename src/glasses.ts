import {
  TextContainerProperty,
  CreateStartUpPageContainer,
  TextContainerUpgrade,
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

  constructor(bridge: Bridge) {
    this.#bridge = bridge
  }

  async start(initial: string): Promise<number> {
    this.#setBody(initial, 'double-tap to exit')
    return this.#bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: 1,
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
