# AgentHUD

Read your CLI fleet from Even G2. AgentHUD reads session status from configured
sources and displays a measured line per session. The phone companion connects
to the same authenticated Node bridge as Ask.

## Source setup

Save a private JSON file outside the checkout:

```json
{
  "board_registry": "/path/to/SESSIONS.md",
  "harness_index": "/path/to/session-index.db",
  "stale_after_seconds": 900
}
```

Use either source or both. The board adapter reads Markdown columns `Session`,
`State`, `Task`, `Transcript`, and optional `Expected output`, `Role`, `Decision`.
The harness adapter reads the session index and lifecycle records used by Muse.
For a remote source machine, add `"ssh_target": "fleet-host"`, using an existing
SSH alias and source paths on that machine.

The collector uses Python 3 and its standard library. Remote reads use OpenSSH
with noninteractive authentication.

```bash
chmod 600 /path/to/fleet-sources.json
AGENTHUD_FLEET_CONFIG=/path/to/fleet-sources.json npm run bridge
```

On a managed workstation, use its service launcher to run that command.

Every record contains a name, state, current task, last artifact/output, pending
decision, source and timestamp. States are `working`, `parked`, `done`, `failed`
and `needs-decision`. Explicit lifecycle events supplement board snapshots.
Artifacts include a filename, modification timestamp and byte size when present.
`~` marks activity older than the configured freshness window. The recorded
state and its timestamp stay together.

## Package for your bridge

Use an HTTPS bridge base URL reachable from the phone:

```bash
AGENTHUD_BRIDGE_URL=https://bridge.example/g2 npm run pack:agenthud
```

This produces `agenthud-0.2.0.ehpk`. The packager adds that exact HTTPS origin to
the network permission whitelist and embeds the bridge default in the app. It
keeps SDK 0.0.14 and minimum Even app 2.2.9. AgentHUD uses the existing app
identifier and storage keys, with a separate manifest and build command.

[Even Hub networking](https://hub.evenrealities.com/docs/build/networking)
describes the origin whitelist and browser CORS checks. The bridge serves CORS
preflight for authenticated requests. A proxy must forward `/fleet`,
`/fleet/render-receipts`, `/health`, `/pair`, `/ask`, `/log` and `OPTIONS`.

Install through Even Hub Private builds. Open AgentHUD, use **Bridge address →
Save & test**, and pair using a current bridge code. A paired AgentHUD build
opens the fleet. **Ask Claude** returns to the existing phone prompt form.

## Fleet controls

| Control | Result |
| --- | --- |
| Scroll down / up | Next / previous fleet page |
| Single tap | Read a fresh snapshot |
| Double-tap | Exit |
| Phone Refresh fleet | Read a fresh snapshot |

The layout uses eight session lines, a title and a footer in the 576 × 288
container. Text is fitted using Pretext glyph measurements within 568 pixels.
The bridge caches concurrent source reads for five seconds; the active phone
view refreshes every fifteen seconds.

Fleet requests read source files. Display observations are saved separately in
`~/.config/agenthud/receipts/renders.jsonl`, or `AGENTHUD_RECEIPT_DIR`.

## Measurements

[Transport receipt](receipts/agenthud-transport.json) records the configured
source counts, source timestamps, snapshot hash, submitted-frame hashes and SDK
observations from the desktop browser. Private fleet names and frame contents
stay in the configured proof directory.

```bash
npm run test:agenthud
npm run typecheck
npm run check:agenthud
```

To repeat the browser run against your real sources:

```bash
npx playwright install chromium
AGENTHUD_FLEET_CONFIG=/path/to/fleet-sources.json \
AGENTHUD_PROOF_DIR=/path/to/private-proof \
node scripts/prove-agenthud.mjs
```

The proof opens the real app, pairs, reads the feed, pages the list and sends
an Ask through the installed Claude CLI. Its private output contains source and
frame content; the public receipt contains hashes and measurements.

## G2 recording

Use the installed app with the bridge console visible. Correlate its fleet
snapshot ID with `renders.jsonl`; record the actual lens text, page changes,
refresh and double-tap exit. The SDK receipt records the app's device-model and
display acknowledgement observations. Keep the recording and its timestamp with
the matching source and render receipts.

## Next

G2 fleet recording, one-line Muse summaries, and an Agent detail view.

[Source adapter](../bridge/collect_fleet.py) ·
[Read-only API](../bridge/fleet.mjs) ·
[Layout](../src/lib/fleet.ts)
