# Claude Code bridge

The bridge runs on your computer and invokes
`claude -p <prompt> --output-format text`. It uses the process's working directory,
PATH and existing Claude login. Each Ask starts a separate CLI invocation and returns a complete answer. [Installation](SETUP.md).

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `BRIDGE_HOST` | `127.0.0.1` | Bind address; keep loopback behind an HTTPS proxy |
| `BRIDGE_PORT` | `8787` | HTTP port on the computer |
| `BRIDGE_TIMEOUT_MS` | `180000` | Claude execution timeout |
| `VITE_BRIDGE_URL` | `http://localhost:8787` | App build-time bridge address; saved phone settings take precedence |

## HTTP API

| Request | Authentication / result |
| --- | --- |
| `GET /health` | Unauthenticated liveness: `{ok:true, service:"g2-claude-bridge"}` |
| `POST /pair` with `{code, deviceName}` | Redeems a code for `{ok:true, token}` |
| `POST /ask` with `{prompt}` | Bearer token required; returns `{ok:true, text, ms}` or a JSON error |
| `POST /log` with `{msg}` | Bearer token required; writes device diagnostics to the console |

Prompts must be nonempty and at most 4000 characters. CORS preflight permits
Content-Type and Authorization. Logs include a prompt prefix and device
diagnostics; treat them as private data.

## Pairing and revocation

Startup prints a single-use code valid for five minutes. Restart the bridge for
a new code. Device tokens contain 32 random bytes; only their SHA-256 hashes are
saved in `~/.config/g2-claude/devices.json`, with file mode `0600`.

**Unpair** clears the phone's token. To revoke access on the computer, first
list device IDs from the repository root:

```bash
node --input-type=module -e "import {listDevices} from './bridge/auth.mjs'; console.log(await listDevices())"
```

Replace `DEVICE_ID` with an ID from that list:

```bash
node --input-type=module -e "import {revokeDevice} from './bridge/auth.mjs'; console.log(await revokeDevice('DEVICE_ID'))"
```

The device returns to pairing on its next Ask. Restart the bridge to generate
a fresh pairing code.
Device tokens authorize prompts to your Claude installation. Use a private
network and HTTPS for phone access.

## Connection checks

| Check | Action |
| --- | --- |
| Bridge port | Start the bridge and match `BRIDGE_PORT` to the HTTPS proxy target. |
| Local health | Request `/health` and confirm the service JSON. |
| Phone route | Open the HTTPS bridge URL on the phone; check VPN routing, proxy path and TLS. `localhost` addresses the phone itself. |
| Pairing code | Enter the current code within five minutes. Restart the bridge after redemption or expiry. |
| Request arrival | Use **Bridge address → Save & test**, pair, and send a question. Watch for `[ask ]`. |
| Claude response | Follow `[ask ]` with `[ok ]` and the phone answer. For `[err ]`, check the executable, login and timeout. |
| G2 display | Read the answer on the lenses, scroll through a longer answer and double-tap to exit. |

Health confirms HTTP reachability. Ask exercises the installed Claude CLI.
For an installed-app check, open **G2 Claude** and correlate the phone result
with `[ask ]`, `[ok ]` or `[err ]` in the bridge console.

WebView traffic can follow a different path from a phone browser when a VPN is
active. Check CORS and Even Hub's network permissions in the
[vendor connection model](https://hub.evenrealities.com/docs/get-started/architecture).
Upcoming installed-app and lens checks are listed in [News](../README.md#news).
