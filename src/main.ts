import { waitForEvenAppBridge, OsEventTypeList } from '@evenrealities/even_hub_sdk'
import { GlassesDisplay } from './glasses'
import { mountPhoneUI } from './phone'
import { initStore } from './lib/store'
import { loadState, isPaired, report } from './lib/bridge'

const bridge = await waitForEvenAppBridge()

// The SDK's storage is the only kind that survives an app exit in this WebView,
// so wire it up before anything reads the saved token.
initStore(bridge)
await loadState()

const display = new GlassesDisplay(bridge)

const IDLE = isPaired()
  ? 'G2 Claude\n\nType a question on your phone.\nThe answer lands here.'
  : 'G2 Claude\n\nNot paired yet.\nOpen this app on your phone to pair.'

// `createStartUpPageContainer` returns 0 on success. A non-zero result means
// the glasses never got a page, which looks to the wearer like the app simply
// did not open — so it is reported rather than swallowed into the console.
let startResult: number | string
try {
  startResult = await display.start(IDLE)
} catch (e) {
  startResult = e instanceof Error ? e.message : String(e)
}
console.log('Page created:', startResult === 0 ? 'success' : `failed (${startResult})`)
report(`startup: paired=${isPaired()} createStartUpPageContainer=${startResult}`)

// Reads the event type out of one envelope.
//
// CLICK_EVENT is 0, and protobuf omits zero-value fields on the wire, so a
// single tap arrives as an envelope whose `eventType` is `undefined`. The
// default has to be resolved INSIDE the envelope check. Writing
// `event.sysEvent?.eventType ?? OsEventTypeList.CLICK_EVENT` instead would
// read CLICK on events that carry no `sysEvent` at all, so every scroll,
// exit and audio frame would fire the tap handler.
function eventTypeOf(envelope?: { eventType?: OsEventTypeList }): OsEventTypeList | null {
  if (!envelope) return null
  return envelope.eventType ?? OsEventTypeList.CLICK_EVENT
}

// Event routing, critical details:
//   • Taps/double-taps/lifecycle come through `event.sysEvent`.
//     Scroll gestures come through `event.textEvent`. Never mix them.
//   • Double-tap → `shutDownPageContainer(1)` is a root-level check: it
//     must fire no matter which envelope the event arrives in, so users
//     can always exit the app.
//   • Check DOUBLE_CLICK_EVENT before CLICK_EVENT.
const unsubscribe = bridge.onEvenHubEvent((event) => {
  const sysType = eventTypeOf(event.sysEvent)
  const textType = eventTypeOf(event.textEvent)

  if (
    sysType === OsEventTypeList.DOUBLE_CLICK_EVENT ||
    textType === OsEventTypeList.DOUBLE_CLICK_EVENT
  ) {
    bridge.shutDownPageContainer(1)
    return
  }

  // Scroll turns pages of a long answer.
  if (sysType === OsEventTypeList.SCROLL_BOTTOM_EVENT || textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    display.nextPage()
    return
  }
  if (sysType === OsEventTypeList.SCROLL_TOP_EVENT || textType === OsEventTypeList.SCROLL_TOP_EVENT) {
    display.prevPage()
    return
  }

  // Coming back to the foreground can leave the glasses on a stale frame, so
  // redraw whatever the display already holds.
  if (sysType === OsEventTypeList.FOREGROUND_ENTER_EVENT) {
    display.redraw()
    return
  }

  if (sysType === OsEventTypeList.SYSTEM_EXIT_EVENT || sysType === OsEventTypeList.ABNORMAL_EXIT_EVENT) {
    unsubscribe()
  }
})

mountPhoneUI(document.getElementById('app')!, {
  onStatus: (text) => display.show(`G2 Claude\n\n${text}`),
  onAnswer: (text) => display.show(text, 'scroll to read · double-tap to exit'),
  onError: (text) => display.show(`Problem\n\n${text}`),
})
