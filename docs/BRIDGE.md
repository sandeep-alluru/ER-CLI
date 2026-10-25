# Claude Code bridge

The bridge runs on your computer and invokes
`claude -p <prompt> --output-format text`. It uses the process's working directory,
PATH and existing Claude login. Each Ask returns one complete answer; there is
no streaming or shared chat session. [Installation](SETUP.md).

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

The device's next Ask fails authentication and returns to pairing. Restart the
bridge for a new code to pair again. There is no HTTP code-minting endpoint.
Keep the bridge on a private network behind HTTPS; anyone with a valid device
token can send prompts to your Claude installation.

## Connection troubleshooting

| Symptom | Action |
| --- | --- |
| Bridge cannot listen | Check whether port 8787 is occupied; match `BRIDGE_PORT` to the proxy target. |
| Local `/health` fails | Start the bridge and inspect the terminal. Claude login is not needed for this endpoint. |
| Phone reports `No answer` / `Load failed` | Test the HTTPS URL from the phone. Check VPN routing, proxy path, TLS and mixed content. Phone-local `localhost` cannot reach your computer. |
| Pairing rejects a code | Use the current code within five minutes. Restart after redemption or expiry. |
| Ask has no `[ask ]` line | Check **Bridge address → Save & test**, pairing and the phone error. Authentication errors occur before the Ask log. |
| Ask logs `[err ]` / HTTP 502 | Check the Claude executable, login and timeout in the bridge's environment. |
| Phone has an answer but lenses do not | Check the SDK/display connection on the physical glasses. |

A health response proves HTTP reachability, not Claude availability. A successful
desktop Ask does not establish installed WebView networking or lens receipt.
The installed phone-to-glasses Ask path remains unverified.

For an installed-app check, open **G2 Claude**, use **Save & test**, and submit a
short question with the bridge console visible. Correlate the phone result with
`[ask ]`, `[ok ]` or `[err ]`, then check the answer on the lenses. Test scrolling
a longer answer and double-tap exit separately.

WebView traffic can follow a different path from a phone browser when a VPN is
active. Also check CORS and Even Hub's network permissions, described in the
[vendor connection model](https://hub.evenrealities.com/docs/get-started/architecture).
No `/ask` code defect has been established; VPN routing is a possible cause of
installed-app connection failures, not a confirmed diagnosis.
