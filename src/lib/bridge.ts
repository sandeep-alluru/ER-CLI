// Client for the Claude Code bridge running on the dev machine.
//
// The glasses cannot run Claude Code — they are a display driven by the phone.
// This talks to bridge/server.mjs, which shells out to the `claude` CLI.
//
// Pairing is required because driving a coding agent remotely is remote code
// execution; the bridge refuses every /ask without a device token.

import { storeGet, storeSet, storeDel } from './store'

const TOKEN_KEY = 'g2claude.token'
const URL_KEY = 'g2claude.bridgeUrl'

/**
 * Default bridge address for an INSTALLED app. An installed .ehpk is not
 * served from the dev server — its `location` is the Even Hub host, not the
 * bridge machine — so there is nothing useful to derive a URL from.
 *
 * Bake your own bridge address in at build time:
 *
 *   VITE_BRIDGE_URL=https://<your-node>.<your-tailnet>.ts.net/g2 npm run build
 *
 * It must be HTTPS: a secure page cannot call a plain http:// endpoint, so a
 * LAN address fails as mixed content even at home. The address can also be
 * set on the device (Bridge address, on the pairing screen) — a saved
 * address wins over this default.
 */
const DEFAULT_BRIDGE = import.meta.env.VITE_BRIDGE_URL ?? 'http://localhost:8787'

/** Resolved once at startup so the rest of the app can read it synchronously. */
let base = DEFAULT_BRIDGE
let token = ''

export const bridgeBase = (): string => base
export const isPaired = (): boolean => token.length > 0

/**
 * Load persisted state. Must be awaited before the UI renders, or the app shows
 * "not paired" for a device that is in fact paired.
 *
 *   1. An explicit override, if one was saved on this device.
 *   2. Dev server on :5173  -> bridge is :8787 on the same host.
 *   3. App served on :8443  -> bridge is /g2 on the same host, same origin.
 *   4. Anything else (an installed build) -> the configured default above.
 */
export async function loadState(): Promise<void> {
  token = await storeGet(TOKEN_KEY)

  const override = await storeGet(URL_KEY)
  if (override) {
    base = override.replace(/\/+$/, '')
    return
  }
  const { protocol, hostname, port } = location
  if (port === '5173') base = `${protocol}//${hostname}:8787`
  else if (port === '8443') base = `${protocol}//${hostname}/g2`
  else base = DEFAULT_BRIDGE
}

export async function setBridgeUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, '')
  if (clean) {
    await storeSet(URL_KEY, clean)
    base = clean
  } else {
    await storeDel(URL_KEY)
    await loadState()
  }
}

async function post(path: string, body: unknown, auth = false): Promise<any> {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  // The bridge answers JSON on every path, including its error paths, so a
  // parse failure means something else replied — a proxy, or the wrong port.
  let json: any
  try {
    json = await res.json()
  } catch {
    throw new Error(`bridge returned non-JSON (HTTP ${res.status})`)
  }
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `HTTP ${res.status}`)
  return json
}

export async function health(): Promise<boolean> {
  try {
    return (await fetch(`${base}/health`)).ok
  } catch {
    return false
  }
}

/** Redeem a console pairing code. Codes are single-use and expire in 5 minutes. */
export async function pair(code: string, deviceName: string): Promise<void> {
  const res = await post('/pair', { code: code.toUpperCase().trim(), deviceName })
  token = res.token
  await storeSet(TOKEN_KEY, token)
}

export async function unpair(): Promise<void> {
  token = ''
  await storeDel(TOKEN_KEY)
}

export async function ask(prompt: string): Promise<string> {
  if (!token) throw new Error('not paired')
  try {
    const { text } = await post('/ask', { prompt }, true)
    return text
  } catch (e) {
    // A revoked or stale token should drop us back to the pairing screen rather
    // than looping on an error the user cannot act on.
    if (e instanceof Error && /unauthorized/i.test(e.message)) await unpair()
    throw e
  }
}

/**
 * Report a device-side event to the bridge console.
 *
 * The glasses have no console reachable from the dev machine, so lifecycle and
 * failures are shipped here instead. Never throws — diagnostics must not be
 * able to break the thing they are diagnosing.
 */
export function report(msg: string): void {
  if (!token) return
  void post('/log', { msg }, true).catch(() => {})
}
