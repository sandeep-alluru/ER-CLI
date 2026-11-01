import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { GlassesDisplay } from './glasses'
import { mountPhoneUI } from './phone'
import { initStore } from './lib/store'
import { loadState, isPaired, report } from './lib/bridge'
import { FleetView } from './fleet'
import { gestureOf } from './lib/gestures'

const bridge = await waitForEvenAppBridge()

// The SDK's storage is the only kind that survives an app exit in this WebView,
// so wire it up before anything reads the saved token.
initStore(bridge)
await loadState()

const display = new GlassesDisplay(bridge, import.meta.env.VITE_AGENTHUD === '1')
let fleet: FleetView | undefined

const IDLE = isPaired()
  ? import.meta.env.VITE_AGENTHUD === '1' ? 'AgentHUD\n\nReading fleet...' : 'G2 Claude\n\nType a question on your phone.\nThe answer lands here.'
  : 'Pair this app on your phone.\n\nEnter the code from the bridge.'

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

// Resolve envelopes once; scroll takes precedence over an empty click envelope.
const unsubscribe = bridge.onEvenHubEvent((event) => {
  const gesture = gestureOf(event)
  if (gesture === 'back') {
    if (fleet?.active && !fleet.back()) return
    fleet?.leave()
    void bridge.shutDownPageContainer(1)
  } else if (gesture === 'next') {
    if (fleet?.active) fleet.movePage(1)
    else display.nextPage()
  } else if (gesture === 'previous') {
    if (fleet?.active) fleet.movePage(-1)
    else display.prevPage()
  } else if (gesture === 'tap') {
    if (fleet?.active) fleet.tap()
  } else if (gesture === 'foreground') {
    if (fleet?.active) void fleet.redraw()
    else display.redraw()
  } else if (gesture === 'exit') {
    fleet?.leave()
    unsubscribe()
  }
})

mountPhoneUI(document.getElementById('app')!, {
  onStatus: (text) => display.show(`G2 Claude\n\n${text}`),
  onAnswer: (text) => display.show(text, 'scroll to read · double-tap to exit'),
  onError: (text) => display.show(`Problem\n\n${text}`),
  onFleet: (root, onBack) => {
    fleet?.leave()
    fleet = new FleetView(root, {
      onBack: () => { display.show(isPaired() ? 'G2 Claude\n\nType a question on your phone.' : 'Pair this app on your phone.'); onBack() },
      onFrame: async (text, footer, title) => {
        const [result, device] = await Promise.all([display.showAndConfirm(text, footer, title), bridge.getDeviceInfo()])
        return { lines: result.lines, sdk_accepted: result.accepted, runtime: device ? 'even-hub' : 'desktop', device_model: device?.model === 'g2' ? 'g2' : null }
      },
    })
  },
})
