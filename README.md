# ER-CLI · G2 Claude

Type a question on your phone. Read Claude Code's answer on your Even Realities
G2 glasses, scrolling through longer replies with the touchpad.

ER-CLI contains the **G2 Claude** Even Hub app and a small Node bridge that runs
`claude -p` on your computer. The phone sends the prompt; the bridge uses that
computer's Claude Code login and working directory; the phone renders the answer
on the 576 × 288 lens display. Each Ask starts a separate CLI invocation.

**Status: experimental, v0.1.3.** Historical hardware notes report installation,
persistent pairing and app screens. The packaged **Ask round-trip on glasses is
still unverified** and remains the owner's test. The owner later used a separate
[Claude Remote app](https://github.com/ThatCrispyToast/g2-claude-remote); its success
is not evidence that this app's Ask flow works on glasses.

```text
Phone · Even Hub app ── Bluetooth ──> G2 lens display + touchpad
        │ prompt / answer (HTTPS)
        ▼
Computer · Node bridge on 127.0.0.1:8787 ──> claude -p
```

[First run](#first-run) · [Development](docs/DEVELOPMENT.md) ·
[Bridge reference](docs/BRIDGE.md) · [Demo evidence](docs/DEMO.md)

![Actual G2 Claude pairing form in a desktop browser](docs/assets/desktop-pairing.png)

*Desktop pairing screen; [capture provenance and limits](docs/DEMO.md). No lens
or hardware Ask capture is claimed.*

## First run

### 1. Install the project

You need Git, Node **20.19+ within 20.x, or 22.12+**, npm, and access to this
repository. The verification environment uses Node 22.22.2 and npm 10.9.7 on
Linux. The CLI and optional desktop simulator are local dependencies; global
Even Hub tooling is unnecessary.

```bash
git clone git@github.com:sandeep-alluru/ER-CLI.git
cd ER-CLI
npm ci
npm run typecheck
npm run build
```

For the bridge, install and sign in to [Claude Code](https://code.claude.com/docs/en/setup)
on the same computer. Confirm `claude --version` works in the shell that will
start the bridge. The app needs G2 glasses paired to the Even Realities phone app
and the same account signed into the [Even Hub portal](https://hub.evenrealities.com).
See the vendor's [setup guide](https://hub.evenrealities.com/docs/get-started/quickstart).

### 2. Start the bridge

From the repository root, leave this terminal running:

```bash
npm run bridge
```

It prints its loopback address and a **single-use pairing code**, valid for five
minutes. Restart the bridge to get a new code if one expires or was already used.
Claude runs with the bridge process's working directory and existing login.

In another terminal, check liveness:

```bash
curl --fail http://127.0.0.1:8787/health
# {"ok":true,"service":"g2-claude-bridge"}
```

A healthy bridge does not prove that Claude is installed or signed in; Ask checks
that separate boundary. Prompts may cause Claude Code to use tools on this computer.

### 3. Give the phone an HTTPS bridge address

An installed app cannot use `localhost` to reach your computer. Its bridge URL
must be **HTTPS** to avoid mixed-content blocking in the phone WebView. Keep the
bridge bound to loopback and put an HTTPS proxy in front of it.

One option is [Tailscale Serve](https://tailscale.com/kb/1242/tailscale-serve):
with Tailscale configured on both computer and phone, run on the computer:

```bash
tailscale serve --bg --set-path /g2 http://127.0.0.1:8787
```

Use the actual HTTPS URL printed by Serve, including `/g2`. The phone must be
connected to the same tailnet. Check existing Serve routes before changing them.
Another HTTPS proxy is fine if it forwards `/health`, `/pair`, `/ask`, `/log`
and CORS preflight requests. [Bridge configuration and troubleshooting](docs/BRIDGE.md).

### 4. Package and install G2 Claude

```bash
npm run pack
# creates g2-claude-0.1.3.ehpk
```

Upload the package in your project's **Private builds** in the Even Hub portal,
then install it in the phone app: **Even Hub → Me → Apps → Private builds**.
Use the same account on the portal and phone. See the vendor's
[Private Testing guide](https://hub.evenrealities.com/docs/test/private-testing).
The package name is `com.aitiuminc.g2claude`; its display name is **G2 Claude**.

### 5. Pair and Ask

1. Open **G2 Claude** in Even Hub on the phone.
2. Expand **Bridge address**, enter your computer's HTTPS bridge URL, and tap
   **Save & test**. Continue when it reports **Reachable**. The packaged fallback
   is `http://localhost:8787`; replace it before pairing.
3. Enter the fresh code from the bridge terminal and tap **Pair this phone**.
   The phone stores its token and bridge address through the Even Hub SDK.
4. Type a short question and tap **Ask**. The phone shows **Thinking…**, followed
   by the answer or an error. Watch the bridge for `[ask ]` and `[ok  ]` or `[err ]`.
5. The answer is sent to the glasses. Scroll down/up to turn pages; double-tap
   exits. **This last packaged phone-to-glasses round-trip still needs owner
   verification.**

The app accepts a build-time `VITE_BRIDGE_URL` as an alternative default; a saved
phone address takes precedence. Keep bearer tokens and pairing codes private.
The phone's **Unpair** clears its local token; server-side revocation is separate.

## Develop

```bash
npm run dev        # keep running; http://localhost:5173
npm run simulate   # separate terminal; desktop UI environment required
```

For QR loading on a phone, use `npx evenhub qr --url http://<computer-LAN-IP>:5173`
and scan inside Even Hub with Developer Mode enabled. Keep phone and computer on
reachable networks; `localhost` points to the phone itself. On port 5173 the app
defaults its bridge to port 8787 on the same hostname; use **Bridge address** to
select your HTTPS proxy since the bridge binds loopback by default.

A desktop browser can exercise the phone form but cannot prove SDK persistence,
lens rendering or packaged WebView networking. [Commands and verification](docs/DEVELOPMENT.md).

## Project map

| Path | Role |
| --- | --- |
| `src/main.ts` | SDK startup and glasses event routing |
| `src/phone.ts` | Phone pairing, bridge setting and Ask form |
| `src/glasses.ts`, `src/lib/text.ts` | Glyph-width wrapping and paginated lens text |
| `src/lib/bridge.ts`, `src/lib/store.ts` | HTTP client and SDK-backed device state |
| `bridge/server.mjs`, `bridge/auth.mjs` | Claude CLI bridge and device authentication |
| `app.json` | Even Hub manifest: v0.1.3, SDK 0.0.14, app 2.2.9 minimum |
| `docs/NEXT-STEPS.md` | Historical experiments and owner-reported hardware evidence |

When reporting a failure, include the app version, loading method (package, QR
or desktop), reachability result, and redacted bridge error. Never include codes,
tokens, private prompts or machine credentials.
