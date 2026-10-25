# Bridge reference

The [README](../README.md) gives the ordered first-run path. The bridge uses only
Node built-ins and invokes `claude -p <prompt> --output-format text` with
`execFile`, inheriting the process's working directory and Claude login. It
returns a complete answer; there is no streaming or shared chat session.

| Setting | Default | Meaning |
| --- | --- | --- |
| `BRIDGE_HOST` | `127.0.0.1` | Bind address; keep loopback behind the HTTPS proxy |
| `BRIDGE_PORT` | `8787` | HTTP port on the bridge computer |
| `BRIDGE_TIMEOUT_MS` | `180000` | CLI execution timeout |
| `VITE_BRIDGE_URL` | `http://localhost:8787` | App build-time bridge default; not a bridge-server setting |

| Request | Authentication / result |
| --- | --- |
| `GET /health` | Public liveness: `{ok:true, service:"g2-claude-bridge"}` |
| `POST /pair` with `{code, deviceName}` | Redeems a console code for `{ok:true, token}` |
| `POST /ask` with `{prompt}` | Bearer token required; returns `{ok:true, text, ms}` or JSON error |
| `POST /log` with `{msg}` | Bearer token required; writes device diagnostics to bridge console |

Prompts must be nonempty and at most 4000 characters. The server allows CORS
preflight for Content-Type and Authorization. Its logs include a prompt prefix
and device diagnostics: treat logs as private data.

## Pairing and revocation

Startup prints one code, single-use with a five-minute lifetime. A restart
invalidates outstanding codes and prints a new one. The device receives a random
32-byte token; only its SHA-256 hash is persisted in
`~/.config/g2-claude/devices.json` with file mode `0600`. These are implementation
properties in `bridge/auth.mjs`, not a claim of a comprehensive security audit.

**Unpair** clears phone state; it does not revoke the server record. From the
repository root, list device IDs without token hashes:

```bash
node --input-type=module -e "import {listDevices} from './bridge/auth.mjs'; console.log(await listDevices())"
```

To revoke one device, replace the example ID with an ID from that list:

```bash
node --input-type=module -e "import {revokeDevice} from './bridge/auth.mjs'; console.log(await revokeDevice('DEVICE_ID'))"
```

Revoking a device causes its next Ask to fail authentication and return to pairing.
Restart the bridge for a new code to pair again. No public code-minting endpoint
exists. Do not distribute tokens, publish logs, or expose the bridge directly to
the public internet.

## Troubleshooting by boundary

| Symptom | Check |
| --- | --- |
| `npm run bridge` cannot listen | Is port 8787 already in use? Check `BRIDGE_PORT` and match the proxy target. |
| `/health` fails locally | Start the bridge and inspect the terminal; Claude login is not involved yet. |
| Phone says `No answer` / `Load failed` | Test the HTTPS bridge URL from the phone. Check VPN, proxy route, TLS and mixed content; do not use phone-local `localhost`. |
| Pairing rejects the code | Use the current terminal's code within five minutes; restart after redemption or expiry. |
| Ask has no `[ask ]` line | Check phone **Bridge address → Save & test**, then token/pairing and the phone error. This was the unresolved packaged hardware symptom in the historical notes. |
| Ask logs `[err ]` / HTTP 502 | Confirm `claude` is on the bridge's PATH and authenticated; inspect the redacted CLI error and timeout. |
| Phone has an answer, lenses do not | This is a separate SDK/display boundary requiring the owner's glasses. |

A health check proves HTTP reachability only. Successful desktop Ask proves the
browser → Node → CLI → browser path only. Packaged WebView networking and lens
behavior require the separate owner test.

## Packaged Ask: hypothesis and settling test

No code bug in `/ask` has been proven. The recorded desktop browser → Node →
Claude → browser request succeeded, while the historical packaged session showed
pairing but no `[ask ]` line. The leading hypothesis is the network path between
Even Hub's WebView and the phone's Tailscale VPN. It remains a hypothesis, not a
diagnosis or evidence that every other cause is excluded.

The owner must open the installed app on his paired phone, use **Bridge address
→ Save & test**, and submit a short Ask while watching the actual bridge console.
Record the reachability result, phone error/status and whether `[ask ]`, `[ok ]`
or `[err ]` appears, then verify receipt on the lenses. A successful desktop
request cannot replace this test. Redact addresses and credentials in shared
records. If transport fails, inspect HTTPS/VPN routing, CORS and the platform's
network permissions; the vendor documents both whitelist and CORS checks in its
[connection model](https://hub.evenrealities.com/docs/get-started/architecture).
The manifest currently requests no permissions; that fact alone does not prove
the cause of the historical failure. No speculative code or manifest fix was
made during the product-direction rework.
