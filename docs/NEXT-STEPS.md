# even-realities — resume state & next steps

Checkpointed 2026-08-27 ~04:05 UTC, after session `8325f9dd` hung at 04:03:16Z.
Reconstructed from BOTH session logs in
`~/.claude/projects/-home-clawer-samurai-1-AgentHub-even-realities/`
(2 of 2 files, 94 of 94 tool calls, 7 of 7 human prompts — full coverage).

## Where the last session stopped

Last assistant output: 04:00:10Z, explaining the developer-mode gate.
Last event: a system record at 04:03:16Z. No further turns. Nothing was
mid-write; no partial edits on disk.

## VERIFIED machine state (re-checked 2026-08-27 04:05Z, not carried over)

| Fact | Evidence |
|---|---|
| Vite dev server UP | `ss -tlnp` → `*:5173` pid 292475; survived the hang |
| Reachable on LAN | `curl -o /dev/null -w %{http_code}` → `200` on 192.168.68.64, 192.168.68.58, 127.0.0.1 |
| Two NICs, same /22 | enp0s31f6 192.168.68.64, wlp5s0 192.168.68.58 |
| QR cached | `~/.config/evenhub/qr.yaml` → http://192.168.68.64:5173/ |
| `g2-qr.png` valid | 462×462 RGBA, encodes `http://192.168.68.64:5173` |
| **No phone has connected** | every peer in `ss -tan sport/dport :5173` is this host; every client in `vite-live.log` logged `[EvenAppBridge] postMessage: Flutter handler not available`, which fires only OUTSIDE the Even Hub webview |
| **`evenhub login` never run** | `~/.config/evenhub/` holds only `qr.yaml` + `simulator.yaml` — no credential file |
| `app.json` still placeholder | `package_id: com.example.evenhubminimal` |
| **Repo has ZERO commits** | `git log` → `fatal: your current branch 'master' does not have any commits yet`; 8 files staged, `g2-qr.png` untracked |

## THE BLOCKER (verified against official docs, not inferred)

`hub.evenrealities.com/docs/get-started/quickstart` states the Scan-QR entry
point **does not exist in the phone app until Developer Mode is enabled**, and
Developer Mode is enabled **on the web, not in the app**:

1. Sign in at <https://hub.evenrealities.com/login>
2. Force-quit and reopen the Even Realities App
3. "the Even Hub tab now shows a developer section in the top" → Scan QR appears

The docs also name the #1 post-scan failure: *"Firewall / AP isolation blocks
phone-to-laptop."* If the QR scans but the app never loads, that is the cause —
not the QR.

Also verified: `evenhub qr -e` opens the QR in an external viewer directly.
The `npm i -g qrcode` detour the last session took was unnecessary.

## Next steps — get the EXISTING app onto the glasses

1. `https://hub.evenrealities.com/login` on this machine, same account as the phone.
2. Force-quit + reopen the Even Realities App on the phone. Confirm a developer
   section appears at the top of the Even Hub tab.
3. `evenhub qr -e` (server is already up — do not restart it).
4. Phone → developer section → Scan QR → point the PHONE camera at the monitor.
   The G2 has no camera; the phone always does the scanning.
5. If it scans but hangs: phone must be on the same Wi-Fi as 192.168.68.0/22, and
   AP isolation / client isolation must be OFF on the router.

## "Claude Code on the glasses" — what is actually buildable

The G2 runs no code. It is a Bluetooth 576×288 display + touchpad driven by the
Even Hub app on the phone, which loads a web app. So Claude Code cannot be
installed on it; it runs HERE and renders THERE.

Input constraint: touchpad is `up`/`down`/`click`/`double_click` only — no
keyboard. But the G2 DOES have a four-mic array (`audioControl(true,
AudioInputSource.Glasses)`, permission `g2-microphone`). CLAUDE.md's "no camera,
no speaker" does not extend to the mic.

Recommended architecture — **voice in on the glasses, Claude Code out on the lens**:

- Front-end: the official `asr` template (mic → STT pipeline, companion UI,
  double-tap exit; STT provider is a deliberate blank stub).
- Back-end: a small local HTTP server on this box wrapping
  `@anthropic-ai/claude-agent-sdk` (v0.3.247 on npm) — this is Claude Code
  packaged as a library: real Read/Write/Edit/Bash/Glob/Grep tools over real
  repos. Docs: <https://code.claude.com/docs/en/agent-sdk>
- Thinnest alternative, zero new deps: shell out to the installed CLI
  (`claude` v2.1.247) with `-p --output-format stream-json`.
- NOT recommended: `@anthropic-ai/sdk` (v0.121.0) called straight from the
  glasses app — that is plain chat with no tools, and it ships an API key in the
  client bundle. Use `claude-opus-5` if you go this way anyway.

## Open items

- [ ] `git commit` — repo has no commits at all; everything is one `rm` from gone.
- [ ] `app.json` `package_id` + `name` are still template placeholders.
- [ ] Decide Agent SDK bridge vs `claude -p` shell-out before writing code.

## UPDATE 2026-08-27 ~04:20Z — Private Builds is the real install path

Owner reached the dev portal and saw **"upload package"**. Per
`hub.evenrealities.com/docs/test/private-testing`, that is the **Private builds**
flow, and it is BETTER than QR for getting a working app on the glasses:

- **No review or approval step** for private builds — they deploy immediately.
- **Account-bound** — installs to your own paired glasses, cannot be shared.
- Exercises the real packaging path end to end (manifest validation, permission
  prompts, icon assets) — QR sideloading skips all of that.
- No LAN / firewall / AP-isolation dependency at all, unlike the QR route.

Portal: project -> **Private builds** tab -> upload `.ehpk`.
Phone: Even Realities App -> **Even Hub** tab -> **Me -> Apps -> Private builds**
-> **Install**. App then appears on the glasses home menu within seconds.

### Done in this session (VERIFIED)

| Change | Evidence |
|---|---|
| `package_id` placeholder -> `com.aitiuminc.g2claude` | validated against all 9 documented app.json field rules — every one PASS |
| `name` -> `G2 Claude` (9 chars, limit 20) | same validation run |
| `min_app_version` 2.0.0 -> **2.2.9** | packer warned 2.0.0 is below SDK 0.0.14's floor; synced, repack is now warning-free |
| `min_sdk_version` 0.0.14 | matches installed SDK 0.0.14 exactly |
| Build | `npm run build` exit 0; `dist/index.html` present |
| Pack | `npx evenhub pack app.json dist -o g2-claude.ehpk` exit 0 |
| Package well-formed | magic bytes `EHPK`, 5 entries, 37630 B compressed from 88285 B of dist |

Backup of the original manifest: `app.json.bak`.

**Caveat:** the packaged app is still the unmodified minimal template — it shows
"Hello from G2!" and nothing else. Uploading it proves the install pipeline
works; it is not yet the Claude app.

## UPDATE 2026-08-29 — Claude Code bridge + remote-control plan

App is CONFIRMED RUNNING on the owner's glasses: shows "Taps: N", increments on
tap (`src/main.ts:70`), double-tap exits. Full chain proven:
machine -> portal -> phone -> glasses.

### Bridge built: `bridge/server.mjs` + `bridge/auth.mjs`

Claude Code cannot run on the glasses. It runs here; the bridge is the doorway.
Shells out to the `claude` CLI, so it uses the existing login on this machine —
no API key stored or needed (verified: `claude -p` returned `BRIDGE OK`, exit 0,
with `ANTHROPIC_API_KEY` unset).

Auth follows grokrc's `src/daemon/auth.ts` model, for the reason stated there:
remote control of a coding agent IS remote code execution. Single-use pairing
codes (5 min TTL, unambiguous alphabet), SHA-256 token hashes at rest,
constant-time compare, 0600 store at `~/.config/g2-claude/devices.json`,
loopback-only bind.

**Test run: 9 of 9 passed**, security cases proven by observing them refuse:
no token -> 401; forged token -> 401; wrong pairing code -> 401; code reuse ->
401; authorised call -> real Claude answer `CONNECTED` in 11.2 s; store 0600;
raw token absent from store; bound to 127.0.0.1 not 0.0.0.0.

### Why NOT reuse grokrc (checked, directive 02)

grokrc is Grok-only by construction: `session-manager.ts:229` trusts only
`grok`/`grok.exe` as argv[0], `acp/transport.ts:140` spawns `grok`, and it
drives the agent over ACP, which the Claude Code CLI does not speak. The only
"claude" hits in that repo are skill paths inside test fixtures. Not a duplicate.

### Tailscale facts (verified 2026-08-29)

- This node: `clawer-samurai-1`, `100.90.129.41`,
  MagicDNS `clawer-samurai-1.tail1306c8.ts.net`, Online: true
- `tailscale serve` ALREADY configured: `/` -> `http://127.0.0.1:4319`
  (that port is pid 4447 — grokrc's daemon). Tailnet-only, not Funnel.
- Owner's `iphone-15-pro-max` is on the tailnet (`100.86.70.71`) but was last
  seen 4 d ago — Tailscale must be running on the phone.
- tailscale 1.102.2 supports `--set-path`.

### PENDING OWNER APPROVAL — the one command

```bash
tailscale serve --bg --set-path /g2 http://127.0.0.1:8787
```

Additive: leaves `/` -> 4319 (grokrc) untouched. Reversible with
`tailscale serve --set-path /g2 off`. Not yet run — it changes serve config that
grokrc depends on, so it waits for the owner.

Result would be `https://clawer-samurai-1.tail1306c8.ts.net/g2/` reachable from
anywhere a device is on the tailnet.

**UNVERIFIED, needs a real test:** whether the Even Hub phone webview routes
through the iOS Tailscale VPN profile. If it does, the glasses app can be served
from the tailnet URL and works anywhere, not just the home LAN. If it does not,
the glasses stay pinned to `192.168.68.64:5173` at home while the phone-side
remote control still works anywhere.

## UPDATE 2026-08-29 (later) — glasses UI built, remote control live

### Tailscale layout (owner approved, applied)

```
https://clawer-samurai-1.tail1306c8.ts.net       /    -> 127.0.0.1:4319   grokrc (pre-existing, untouched)
                                                 /g2  -> 127.0.0.1:8787   Claude bridge
https://clawer-samurai-1.tail1306c8.ts.net:8443  /    -> 127.0.0.1:5173   the glasses app (vite)
```

**Why the app is a whole HTTPS port and not a `--set-path /app` mount:** vite
injects `/@vite/client` as an ABSOLUTE url regardless of `base`, so under a path
mount the HMR client resolves to the tailnet root — grokrc's port — and hot
reload silently dies. Caught by testing, not by reading. Serving at the root of
its own port keeps every absolute URL correct. `base: './'` was tried first and
also works for assets, but does not fix the HMR client.

Also required: `server.allowedHosts` must list the tailnet hostname, or vite
answers "Blocked request. This host is not allowed."

Rollback: `tailscale serve --https=8443 off`, `tailscale serve --set-path /g2 off`.
Pre-change config saved at `docs/tailscale-serve-before.json`.

### Files added

| File | Role |
|---|---|
| `bridge/server.mjs` | HTTP bridge; `/health`, `/pair`, token-gated `/ask` -> `claude -p` |
| `bridge/auth.mjs` | pairing codes + device tokens, grokrc's model |
| `src/lib/text.ts` | pixel-accurate wrap + pagination via `@evenrealities/pretext` |
| `src/lib/bridge.ts` | bridge client; derives its URL from where the page was served |
| `src/glasses.ts` | the lens display — one container, `textContainerUpgrade`, paged |
| `src/phone.ts` | the phone half: pairing screen, prompt box, answer echo |
| `src/main.ts` | wiring + event routing (double-tap exit, scroll = page turn) |

`npm run bridge` starts the bridge. New dep: `@evenrealities/pretext@0.1.4`.

### VERIFIED this session

- `npm run build` (tsc --noEmit + vite build) exit 0.
- Simulator: `Page created: success`, no console errors; glasses framebuffer
  screenshot shows the idle screen correctly, 1705 lit pixels, text spanning
  y=10..273, footer pinned to the last line.
- Real end-to-end through the browser phone UI: paired with a console code,
  asked Claude Code to describe `bridge/`, got a correct 429-char answer in
  15.1 s that had actually READ the files — proving real tool access, not chat.
- Layout tested against that real answer using the REAL module (imported live in
  the page, not a reimplementation): 9 wrapped lines -> exactly 1 page, widest
  line 564 px against a 568 px limit, **0** lines over. A pathological 300-char
  unbroken token wraps to 6 lines at 562 px — no overflow, no hang.
- Only browser console error is a missing `favicon.ico`. The
  "[EvenAppBridge] Flutter handler not available" warnings are expected outside
  the Even Hub host.

### NOT yet verified — needs the owner's hardware

- Answer rendering + scroll paging ON the real glasses. The idle screen is
  screenshot-verified and the answer path uses the same `textContainerUpgrade`
  call, but a real answer has not been put on a real lens. The simulator cannot
  be paired because its WebView has its own localStorage and the automation API
  offers taps/scrolls only — no text entry.
- Whether the Even Hub WebView rides the iOS Tailscale VPN. If yes, point the
  glasses app at `https://clawer-samurai-1.tail1306c8.ts.net:8443/` and it works
  anywhere. If no, the glasses stay on the LAN URL at home.

### Known gap (deliberate, not an oversight)

Pairing codes are only minted at bridge startup. A "mint a code" HTTP endpoint
would be reachable through `/g2` by anything on the tailnet, which would let any
tailnet device pair itself — so it was left out. The fix is a loopback-only
control port that Tailscale does not proxy, mirroring grokrc's control socket.

## PARKED 2026-08-29 — owner called a stop on app building

### Where it actually got to

Working and verified:
- Bridge live at `https://clawer-samurai-1.tail1306c8.ts.net/g2`, answers real
  Claude Code from any tailnet device (curl-verified).
- Phone paired, and the pairing now PERSISTS across app exits.
- Glasses draw text — owner confirmed seeing the app's "Paired" screen.
- App installed on real hardware as v0.1.3.

The one unclosed gap:
- Tapping **Ask** on the phone never reaches the bridge. The bridge log shows
  `[pair]` and no `[ask]`, so the request is failing client-side before the
  fetch completes. Never diagnosed — the owner stopped before running the
  `⚙ Bridge address -> Save & test` check that would have said whether it was
  network or code.

### Bugs I shipped and then fixed (three reinstall cycles, all avoidable)

1. `bridgeBase()` derived the URL from `location`, which is meaningless in an
   installed .ehpk -> "Load failed". Fixed: installed builds default to the
   tailnet HTTPS URL, and the address is editable on-device.
2. Device token kept in browser `localStorage`, which the Even Hub WebView does
   not persist -> re-pair on every launch. Fixed: `bridge.setLocalStorage` /
   `getLocalStorage` via `src/lib/store.ts`.
3. Re-uploaded a build without bumping `version`, so the phone correctly saw
   nothing new to install. Fixed by bumping 0.1.0 -> 0.1.1 -> 0.1.2 -> 0.1.3.

Lesson for whoever picks this up: none of the three were caught by the simulator
or by the browser. All three are properties of the PACKAGED app on real
hardware, which nothing here can emulate. Test packaged early, not last.

### Still running on this machine

- vite dev server on :5173
- Claude bridge on 127.0.0.1:8787
- evenhub simulator (automation :9898)
- `tailscale serve`: `/g2` -> 8787, `:8443` -> 5173, plus grokrc's original
  `/` -> 4319 (never touched)

### Rollback, if wanted

```bash
tailscale serve --set-path /g2 off
tailscale serve --https=8443 off
```
Pre-change config: `docs/tailscale-serve-before.json`. grokrc was unaffected
throughout — `/` was verified 200 after every change.

### THE REPO STILL HAS ZERO COMMITS

Every file described here exists in one directory and nowhere else.

## RESOLVED 2026-08-29 — goal met, via a third-party app not my build

Owner confirmed working: Claude Code on the G2 glasses, reachable from anywhere
on the tailnet.

**What actually got them there:** the Even Hub store app **Claude Code G2**
(`com.thatcrispytoast.clauderemote`, by ThatCrispyToast) plus its own Python
bridge — NOT the app I built. Repo: https://github.com/ThatCrispyToast/g2-claude-remote

```bash
uvx --from "git+https://github.com/ThatCrispyToast/g2-claude-remote#subdirectory=server" claude-remote-bridge
```

Runs on Linux (Python 3.10+/uv). Listens `0.0.0.0:8790`. Token auto-generated to
`~/.config/claude-remote/bridge-token` (0600) as a 5-word passphrase.

**The one piece of mine that mattered:** the Tailscale HTTPS front door.
The bridge only prints `http://` URLs, and the app's WebView refuses plain HTTP
as mixed content — the identical bug that broke my own app earlier. Fixed with:

```bash
tailscale serve --bg --https=8444 http://127.0.0.1:8790
```

Owner enters `https://clawer-samurai-1.tail1306c8.ts.net:8444` + the passphrase
in the app's Settings card. Verified end to end: 401 without token, and with the
token `/api/sessions` returns live sessions — including this very Claude Code
session (`title: "even-realities"`, `model: claude-opus-5[1m]`).

### Final tailscale serve state

```
:443   /     -> 4319   grokrc            (pre-existing, never touched, 200 throughout)
:443   /g2   -> 8787   my bridge         (now redundant)
:8443  /     -> 5173   my vite dev app   (now redundant)
:8444  /     -> 8790   claude-remote     (THE ONE THAT MATTERS)
```

### Honest retrospective

I built a whole app when a better one already existed in the store — voice
input, SSE streaming, session list, maintained by someone else. I never checked
the store before building. The three reinstall cycles I cost the owner were all
avoidable, and so was the build itself.

What was genuinely worth keeping: the Tailscale plumbing, and the diagnosis that
the WebView blocks plain HTTP — that one applied directly to the app that won.

### Still open

- Bridge runs in a FOREGROUND terminal; dies when it closes. A systemd user
  service was offered, not yet accepted.
- Owner's bridge token was pasted into the session log — rotation offered.
- My leftovers still running: bridge 8787, vite 5173, simulator 9898, and the
  `/g2` + `:8443` serve routes. Teardown offered, not yet accepted.
- **THE REPO STILL HAS ZERO COMMITS.**
