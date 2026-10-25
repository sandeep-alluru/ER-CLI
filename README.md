# G2 Claude

Claude Code on Even Realities G2 smart glasses.

The G2 is a Bluetooth display + touchpad: no keyboard, and it runs no code of
its own. So this is two pieces:

- **The app** (`src/`, packaged as an `.ehpk` and loaded by the Even Hub phone
  app) — a phone-side pairing + prompt screen, and a lens display that renders
  Claude's answers pre-paginated at real glyph widths on the 576×288 canvas
  (touchpad: scroll turns the page, double-tap exits).
- **The bridge** (`bridge/`, plain Node, no dependencies) — runs on the machine
  you want to drive and shells out to that machine's own `claude` CLI
  (`claude -p`). It uses the machine's existing Claude login; no API key is
  stored or needed.

```
glasses (Bluetooth display) <-- rendered by the Even Hub phone app
phone (Even Hub WebView) --HTTPS--> bridge (loopback :8787) --> claude -p
```

## Pairing & security

Driving a coding agent remotely is remote code execution, so the bridge refuses
every `/ask` without a device token:

- At startup the bridge prints a single-use pairing code (5-minute TTL). Enter
  it on the phone to pair. Codes are minted only at startup, by design — a
  "mint a code" endpoint would let anything that can reach the bridge pair
  itself.
- The phone receives a random 32-byte device token. The bridge persists only
  its SHA-256 hash (constant-time compare) in
  `~/.config/g2-claude/devices.json`, written `0600`.
- The bridge binds loopback by default. Reach it through a TLS front door
  (below), not by binding it wide.

## Run the bridge

```bash
npm run bridge        # or: node bridge/server.mjs
```

Environment: `BRIDGE_PORT` (default `8787`), `BRIDGE_HOST` (default
`127.0.0.1`), `BRIDGE_TIMEOUT_MS` (default `180000` — how long one Claude
answer may take).

Endpoints: `GET /health` (unauthenticated liveness), `POST /pair`
`{code, deviceName}` → `{token}`, `POST /ask` `{prompt}` with
`Authorization: Bearer <token>` → `{ok, text}`, `POST /log` (device-side
diagnostics, token-gated).

## Make the bridge reachable from the phone

The packaged app runs in the Even Hub WebView on the phone. It can only call
**HTTPS** endpoints — a secure page calling plain `http://` fails as mixed
content — and it does not run on the bridge machine, so it needs a real
address for the bridge. Development used Tailscale Serve as the front door:

```bash
tailscale serve --bg --set-path /g2 http://127.0.0.1:8787
# the bridge is then at https://<your-node>.<your-tailnet>.ts.net/g2
```

Tell the app where the bridge is, either way:

- **Build time:** `VITE_BRIDGE_URL=https://<your-node>.<your-tailnet>.ts.net/g2 npm run build`
- **On the device:** *Bridge address* on the pairing screen. A saved address
  wins over the build-time default, and *Save & test* checks reachability.

In the dev server (`npm run dev`, port 5173) the app instead derives the
bridge as port 8787 on the same host.

## Develop & package the app

```bash
npm install
npm run dev        # vite dev server on :5173
npm run simulate   # Even Hub simulator
npm run pack       # tsc --noEmit && vite build, then evenhub pack -> .ehpk
```

Sideload for development with `npx evenhub qr --url http://<your-lan-ip>:5173`,
scanned from the Even Hub app (needs Developer Mode). To install a package on
real glasses, upload the `.ehpk` in the Even Realities developer portal under
**Private builds** — no review step, but account-bound: it installs only to
your own glasses. Then on the phone: Even Realities App → Even Hub → Me →
Apps → Private builds.

Manifest: `app.json` — package `com.aitiuminc.g2claude`, name "G2 Claude",
edition 202601, minimum Even app 2.2.9, no permissions requested.

## Layout

| Path | What |
|---|---|
| `index.html` | WebView host; CSS locks zoom and kills iOS double-tap zoom / rubber-band scroll |
| `src/main.ts` | Startup: waits for the Even bridge, loads persisted pairing state, routes glasses events |
| `src/phone.ts` | Phone UI: pairing form, prompt box, bridge-address setting |
| `src/glasses.ts` | Lens display — one text container, upgraded in place; long answers pre-paginated |
| `src/lib/bridge.ts` | Bridge client: pair / ask / health / device event log |
| `src/lib/store.ts` | Persistence via the SDK's own storage (browser `localStorage` does not survive app exits in this WebView) |
| `src/lib/text.ts` | Text layout at real glyph widths for the 576×288 canvas |
| `bridge/server.mjs` | The bridge HTTP server |
| `bridge/auth.mjs` | Pairing codes + device tokens (modelled on grokrc's daemon auth) |
| `docs/NEXT-STEPS.md` | The build log: what was tried, what broke on hardware, what was verified |

## Status

v0.1.3 (see `app.json`).

Verified on real hardware: the packaged app installs, pairing persists across
app exits, and the glasses draw the app's screens. The bridge answers real
Claude Code queries from other machines (curl-verified), and answer rendering /
pagination is verified in the simulator.

**Known open item:** the Ask round-trip from the packaged build has not been
completed on hardware. In the last hardware session (2026-08-29) the bridge log
showed the pairings but no `[ask]`, and the check that would isolate network
vs code — *Bridge address → Save & test*, then one Ask with the bridge console
in view — was not run before work stopped. Full record in `docs/NEXT-STEPS.md`
("PARKED 2026-08-29").
