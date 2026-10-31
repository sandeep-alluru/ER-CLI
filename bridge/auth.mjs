/**
 * Pairing and device tokens for the G2 Claude bridge.
 *
 * Remote prompts can invoke local Claude tools, so every Ask must authenticate
 * a paired device before executing the CLI.
 *
 *  - Pairing codes are single-use and expire in minutes.
 *  - Only a SHA-256 hash of each device token is persisted, so a leaked config
 *    file contains hashes rather than credentials.
 *  - Token comparison is constant-time.
 *  - The store is written 0600.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const CONFIG_DIR = process.env.G2_CLAUDE_CONFIG_DIR ?? join(homedir(), '.config', 'g2-claude')
const STORE_PATH = join(CONFIG_DIR, 'devices.json')

const PAIRING_TTL_MS = 5 * 60_000
/** Unambiguous alphabet — excludes 0/O and 1/I/L — because these get typed on a phone. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
/** Outstanding codes allowed at once — enough for a retry, bounded against abuse. */
const MAX_PENDING_CODES = 8

const sha256 = (s) => createHash('sha256').update(s).digest('hex')

async function ensureConfigDir() {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 })
}

async function loadStore() {
  try {
    return JSON.parse(await readFile(STORE_PATH, 'utf8'))
  } catch {
    return { devices: [] }
  }
}

async function saveStore(store) {
  await ensureConfigDir()
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), { mode: 0o600 })
  await chmod(STORE_PATH, 0o600)
}

/** In-memory only. A restart invalidates outstanding codes, which is correct. */
const pending = new Map()

export function createPairingCode() {
  for (const [code, p] of pending) if (p.expiresAt < Date.now()) pending.delete(code)
  if (pending.size >= MAX_PENDING_CODES) throw new Error('too many pending pairing codes')

  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  pending.set(code, { expiresAt: Date.now() + PAIRING_TTL_MS })
  return { code, expiresAt: Date.now() + PAIRING_TTL_MS }
}

/** Redeem a pairing code for a device token. Single use. */
export async function redeemPairingCode(code, deviceName) {
  const entry = pending.get(code)
  if (!entry) return null
  pending.delete(code) // single use, also on an error
  if (entry.expiresAt < Date.now()) return null

  const token = randomBytes(32).toString('base64url')
  const store = await loadStore()
  store.devices.push({
    id: randomBytes(8).toString('hex'),
    name: String(deviceName || 'device').slice(0, 64),
    tokenHash: sha256(token),
    pairedAt: Date.now(),
    lastSeen: Date.now(),
  })
  await saveStore(store)
  return token
}

/** Constant-time check of a bearer token against every stored hash. */
export async function verifyToken(token) {
  if (typeof token !== 'string' || !token) return null
  const candidate = Buffer.from(sha256(token), 'utf8')
  const store = await loadStore()

  let matched = null
  for (const d of store.devices) {
    const known = Buffer.from(d.tokenHash, 'utf8')
    if (known.length !== candidate.length) continue
    // Compare every device — no early exit, so timing is independent of position.
    if (timingSafeEqual(known, candidate)) matched = d
  }
  if (!matched) return null

  matched.lastSeen = Date.now()
  await saveStore(store)
  return { id: matched.id, name: matched.name }
}

export async function listDevices() {
  return (await loadStore()).devices.map(({ tokenHash, ...d }) => d)
}

export async function revokeDevice(id) {
  const store = await loadStore()
  const before = store.devices.length
  store.devices = store.devices.filter((d) => d.id !== id)
  if (store.devices.length === before) return false
  await saveStore(store)
  return true
}
