# AgentHUD

Read your CLI fleet from Even G2. Each page gives one session room: a large
name, its state in plain words, and a line about its task. Tap to read more.

## Connect a board

Save a private JSON file outside the checkout:

```json
{
  "board_registry": "/path/to/SESSIONS.md",
  "stale_after_seconds": 900
}
```

The board uses Markdown columns `Session`, `State`, `Task`, `Transcript`, with
optional `Expected output` and `Decision`. Its state decides membership. Current
working and parked sessions appear; completed and closed sessions leave the
list. Activity older than the configured window leaves the list too. Transcript
events supply activity timestamps and recent output. Working sessions come
first, followed by parked sessions, newest activity first in each group.

For a remote board, add `"ssh_target": "fleet-host"`, using your existing SSH
alias and paths on that host. The collector uses Python 3 and OpenSSH.

```bash
chmod 600 /path/to/fleet-sources.json
AGENTHUD_FLEET_CONFIG=/path/to/fleet-sources.json npm run bridge
```

Use your workstation's service launcher for a persistent bridge. Pair your
phone with the code printed by the bridge. The phone and bridge need a shared
network route.

## Lens controls

| Where | Tap | Scroll | Double-tap |
| --- | --- | --- | --- |
| Fleet tile | Open session detail | Previous / next session | Exit prompt |
| Session detail | Open phone dictation | Read detail pages | Fleet |
| Instruction review | Read next page, then confirm send | Read transcript pages | Cancel to detail |
| Instruction response | Read the response | Read response pages | Detail |

Refresh is a phone button. Page turns and returning to the foreground redraw
the selected page without fetching or resetting the list.

The name is drawn at 36 pixels across four image strips. Native text holds the
state, task and controls within the 576 × 288 display. Frames are serialized so
a slower display update cannot replace a later page.

## Dictate and review

Open a session's detail, then choose **Dictate instruction**. Use the microphone
on your phone keyboard in the existing companion text field. Your words appear
on the lens. Choose **Review instruction**, read all pages, then tap **Confirm
send**. Previewing or editing the words does not send them.

The paired Ask route passes the confirmed words and selected session name to
your installed Claude CLI. It requests delivery through that existing local
session's input interface and verification in its transcript. Its response is
shown on the lens. The CLI uses your configured tools and permissions.

## Build

```bash
AGENTHUD_BRIDGE_URL=https://bridge.example/g2 npm run pack:agenthud
```

This creates `agenthud-0.2.1.ehpk`, using SDK 0.0.14 and minimum Even app 2.2.9.
The exact HTTPS origin is added to the package network whitelist. AgentHUD
retains the app identifier and pairing storage used by the earlier build.

[Even Hub networking](https://hub.evenrealities.com/docs/build/networking)
describes origin permissions and CORS. The bridge serves authenticated fleet,
display observations and Ask through the same base address.

## Simulator measurements

```bash
npm run test:agenthud
npm run typecheck
npm run check:agenthud
AGENTHUD_PROOF_DIR=/path/to/new-private-proof \
AGENTHUD_PROOF_TARGET=your-existing-local-session \
node scripts/prove-agenthud-simulator.mjs
```

The proof uses the official simulator, Xvfb on Linux, Python with Pillow for
framebuffer checks, and local board cases for
repeatable controls. It reads the native framebuffer and saves the bridge's
render receipts. Its instruction test targets the named existing local session
through the real Ask route. Production board snapshots are recorded separately
from these interface cases.

[Measurements](receipts/agenthud-transport.json) contain frame hashes and layout
results. Private session names, frame text, screenshots and instruction content
stay in the selected proof directory.
