// Claude Code remote control — the machine-side half.
//
// The phone drives the glasses display; the computer runs Claude Code.
// So Claude Code runs HERE and this server is the doorway to it.
//
//   GET  /health                      -> liveness, unauthenticated
//   POST /pair   {code, deviceName}   -> {token}   (code comes from the console)
//   POST /ask    {prompt}             -> {ok, text}   Authorization: Bearer <token>
//
// Put an HTTPS proxy in front of the loopback listener for phone access.
// /ask requires a device token because prompts can invoke local Claude tools.
//
// Auth to Anthropic: none of its own. It shells out to the `claude` CLI, which
// uses the login already on this machine. Credentials come from that installation.

import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { createPairingCode, redeemPairingCode, verifyToken } from './auth.mjs'
import { createFleetService } from './fleet.mjs'


const PORT = Number(process.env.BRIDGE_PORT ?? 8787)
// Loopback by default: Tailscale proxies in, so binding wider is needless exposure.
const HOST = process.env.BRIDGE_HOST ?? '127.0.0.1'
const TIMEOUT_MS = Number(process.env.BRIDGE_TIMEOUT_MS ?? 180_000)
const MAX_PROMPT = 4000

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const send = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json', ...CORS })
  res.end(JSON.stringify(obj))
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 1e6) { req.destroy(); reject(new Error('body too large')) }
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })

const readJson = async (req) => {
  try { return JSON.parse(await readBody(req)) } catch { return null }
}

const bearer = (req) => {
  const h = req.headers.authorization ?? ''
  return h.startsWith('Bearer ') ? h.slice(7) : ''
}

function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    execFile(
      'claude',
      ['-p', prompt, '--output-format', 'text'],
      { timeout: TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr?.trim() || err.message))
        resolve(stdout.trim())
      },
    )
  })
}

export function createBridgeServer({ fleet = createFleetService(), ask = askClaude } = {}) {
return createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end() }

  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true, service: 'g2-claude-bridge' })
  }

  if (req.url === '/fleet' && req.method === 'GET') {
    if (!await verifyToken(bearer(req))) return send(res, 401, { ok: false, error: 'Pair this device first' })
    try {
      const snapshot = await fleet.get()
      return send(res, 200, { ok: true, ...snapshot })
    } catch (e) {
      return send(res, 503, { ok: false, error: e.message })
    }
  }

  if (req.url === '/fleet/render-receipts' && req.method === 'POST') {
    const device = await verifyToken(bearer(req))
    if (!device) return send(res, 401, { ok: false, error: 'Pair this device first' })
    try {
      const receipt = await fleet.receipt(await readJson(req), device.id, {
        origin: req.headers.origin ?? null,
        peer: req.socket.remoteAddress ?? null,
        tailnet_identity_header: Boolean(req.headers['tailscale-user-login']),
      })
      return send(res, 200, { ok: true, receipt })
    } catch (e) {
      return send(res, 400, { ok: false, error: e.message })
    }
  }

  if (req.method === 'POST' && req.url === '/pair') {
    const body = await readJson(req)
    if (!body) return send(res, 400, { ok: false, error: 'body must be JSON' })
    const token = await redeemPairingCode(String(body.code ?? '').toUpperCase().trim(), body.deviceName)
    if (!token) return send(res, 401, { ok: false, error: 'invalid or expired code' })
    console.log(`[pair] paired "${body.deviceName ?? 'device'}"`)
    return send(res, 200, { ok: true, token })
  }

  // Device-side diagnostics. The bridge collects device-side console messages,
  // so the app reports its own lifecycle and this prints it next to the asks.
  if (req.method === 'POST' && req.url === '/log') {
    const device = await verifyToken(bearer(req))
    if (!device) return send(res, 401, { ok: false, error: 'unauthorized' })
    const body = await readJson(req)
    console.log(`[dev ] (${device.name}) ${String(body?.msg ?? '').slice(0, 300)}`)
    return send(res, 200, { ok: true })
  }

  if (req.method === 'POST' && req.url === '/ask') {
    const device = await verifyToken(bearer(req))
    if (!device) return send(res, 401, { ok: false, error: 'unauthorized — pair this device first' })

    const body = await readJson(req)
    if (!body) return send(res, 400, { ok: false, error: 'body must be JSON' })
    const prompt = body.prompt
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return send(res, 400, { ok: false, error: 'prompt is required' })
    }
    if (prompt.length > MAX_PROMPT) {
      return send(res, 400, { ok: false, error: `prompt over ${MAX_PROMPT} chars` })
    }

    const started = Date.now()
    // Tailscale hands us the tailnet peer in this header; a LAN request has no
    // such header and shows the 192.168.x address. That difference is the only
    // way to tell "works at home" from "works anywhere" after the fact.
    const via = req.headers['tailscale-user-login']
      ? 'tailnet'
      : (req.socket.remoteAddress ?? 'unknown')
    console.log(`[ask ] (${device.name} via ${via}) ${JSON.stringify(prompt.slice(0, 80))}`)
    try {
      const text = await ask(prompt)
      console.log(`[ok  ] ${text.length} chars in ${Date.now() - started}ms`)
      return send(res, 200, { ok: true, text, ms: Date.now() - started })
    } catch (e) {
      console.error(`[err ] ${e.message}`)
      return send(res, 502, { ok: false, error: e.message })
    }
  }

  send(res, 404, { ok: false, error: 'not found' })
})
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
const server = createBridgeServer()
server.listen(PORT, HOST, () => {
  console.log(`g2-claude-bridge listening on ${HOST}:${PORT}`)
  const { code } = createPairingCode()
  console.log(`\n  pairing code: ${code}    (valid 5 minutes, single use)\n`)
})
}
