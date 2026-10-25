# ER-CLI — Your Claude agent on Even G2

**A glasses-first AI interface for G2 owners: read answers on your HUD from
Claude Code running on your own computer.**

Use the Claude setup and tools you already control while keeping answers in
sight. ER-CLI supplies a G2 app and a self-hosted bridge to your machine. Today
you type prompts on the phone, then use the glasses touchpad to page through
answers. The installed app is named **G2 Claude**.

**Experimental v0.1.3.** HUD screens and persistent pairing have historical
owner confirmation; a real desktop pairing/Ask and fresh-clone packaging have
passed. The packaged on-glasses Ask round-trip is still unverified. **No `/ask`
code bug has been proven.** The leading hypothesis is the network path between
the Even Hub WebView and the phone's VPN; the owner must settle it with his
glasses and bridge console. [Evidence and exact test](docs/BRIDGE.md).

## Your agent, your bridge

**PROPOSED approach name: “Your agent, your bridge.”** The bridge source is
inspectable and changeable, and runs beside your own Claude Code installation.
There is no ER-CLI-hosted relay or replacement assistant account. This is the
choice ER-CLI offers a G2 owner who wants a direct connection to their own agent.

That is control of the bridge and agent process, **not a claim of fully local
AI**. Claude Code sends inference requests to its configured provider; Even Hub
provides the phone runtime and package distribution. See [Claude's data-flow
documentation](https://code.claude.com/docs/en/data-usage#local-claude-code-data-flow-and-dependencies).
Only Claude is implemented today; other agents require bridge changes.

```text
G2 HUD + touchpad <── Bluetooth ──> Even Hub phone WebView
                                      │ prompt / answer over HTTPS
                                      ▼
                              Your Node bridge
                                      │
                              Your Claude Code process
                                      │ model requests
                              Your configured Claude provider
```

[First run](#first-run) · [Product comparison](docs/PRODUCT-COMPARISON.md) ·
[Development](docs/DEVELOPMENT.md) · [Demo evidence](docs/DEMO.md)

## Compare the actual choices

Checked 2026-10-25. **PUBLISHED** means a claim read on the vendor's product,
documentation or repository pages, not tested by us. **FIRST-PARTY** means
ER-CLI code/run evidence. This labels evidence origin, not a quality ranking;
the vendor publications themselves are primary sources. Prices are advertised
hardware prices in USD/US where specified, not total cost or converted quotes.

| Product / evidence | Hardware | Where the AI runs | Open or closed assistant | Self-hosted bridge or vendor cloud | Extensibility | Price basis |
| --- | --- | --- | --- | --- | --- | --- |
| **ER-CLI · FIRST-PARTY** [R1] | G2 HUD + phone + your computer | Claude Code agent/tools on your computer; inference at your Claude provider | Inspectable bridge; Claude-only today, vendor model | Your Node bridge; no ER-CLI relay; Even Hub runtime still required | TypeScript HUD app and Node bridge source | No ER-CLI service fee implemented; G2 from $599 [E3], plus your computer/Claude/network costs |
| **Even AI + Even Hub · PUBLISHED** [E1] [E2] | G2 HUD + phone | Hub apps in phone WebView; built-in AI accessed over internet | Vendor Even AI; Hub also accepts third-party apps | Vendor AI service; individual Hub apps can use their own backends | Hub SDK and app catalogue | G2 from $599 [E3]; app/service charges not established here |
| **Even Terminal Mode · PUBLISHED** [E4] [E5] | Same G2 HUD + phone + host | Coding agent on your host; model provider separate | Vendor integration; published CLI supports Claude and Codex | Host bridge; LAN/private-network or optional tunnel transport | Published CLI/provider options; not proof of open assistant internals | Same G2 hardware; separate software fee not established |
| **Brilliant Halo / Noa · PUBLISHED** [B1] [B2] | Color HUD, sensor, mics, audio + phone | On-device processing plus mobile app and cloud Noa | Programmable platform; bundled Noa is a vendor service | Noa cloud default; custom host apps possible | Lua + Python, Flutter, Web Bluetooth SDK [B3] | $399 USD; capped Noa/Miniapps included [B1] |
| **Brilliant Frame · PUBLISHED, legacy reference** [B3] [B4] | Color HUD, camera, mic + phone/host | Lua on glasses; host app supplies AI; Noa backend placement not verified | Programmable hardware; Noa companion available | App-dependent; no verified default self-hosted Noa deployment | Same host SDK; Lua device API | Current vendor price unverified; product route returns 404 [B5] |
| **MentraOS / Mentra Live · PUBLISHED** [M1] [M2] [M3] | Live: camera/audio; G2 HUD also listed by MentraOS | Phone app runtime; AI placement depends on deployment | Programmable platform; customer chooses AI | Hosted or customer infrastructure advertised | SDK, private apps, multiple supported glasses | Live $449 [M2]; software/deployment charges separate, not established |
| **Ray-Ban Meta Gen 2 · PUBLISHED** [F1] [F2] [F3] | Camera/audio glasses, no HUD; Meta AI phone app | Glasses capture, phone connection, Meta cloud AI | Bundled Meta AI vendor-controlled; developer apps supported | Meta cloud for bundled AI; toolkit app backends vary | Mobile Device Access Toolkit [F3] | From $379 US hardware [F1]; lenses/services separate |
| **Meta Ray-Ban Display · PUBLISHED** [F3] [F4] | HUD, camera/audio + phone + Neural Band | Bundled Meta AI service; app placement depends on integration | Vendor Meta AI plus third-party app paths | Default vendor assistant; custom app backends possible | Mobile toolkit and display Web Apps | From $799 US hardware including band [F4] |

Even Terminal Mode already connects G2 to host-side agents. Mentra advertises
customer-hosted AI; Brilliant offers programmable glasses; Meta exposes developer
APIs. ER-CLI's case is its focused, inspectable G2/Claude path, **not exclusive
ownership of the “own agent” idea**. Display, voice, session control and deployment
maturity differ; [source notes and limits](docs/PRODUCT-COMPARISON.md) explain why
the prices are not interchangeable bundles.

![Actual G2 Claude pairing form in a desktop browser](docs/assets/desktop-pairing.png)

*Actual desktop UI; no lens capture or packaged Ask success is implied.*

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

[E1]: https://www.evenrealities.com/ai-glasses
[E2]: https://hub.evenrealities.com/docs/get-started/architecture
[E3]: https://www.evenrealities.com/store
[E4]: https://www.evenrealities.com/terminal
[E5]: https://www.npmjs.com/package/@evenrealities/even-terminal/v/0.10.5
[B1]: https://brilliant.xyz/products/halo
[B2]: https://brilliant.xyz/
[B3]: https://github.com/brilliantlabsAR/brilliant_sdk
[B4]: https://docs.brilliant.xyz/frame/hardware/
[B5]: https://brilliant.xyz/products/frame
[M1]: https://mentraglass.com/
[M2]: https://mentraglass.com/live
[M3]: https://github.com/Mentra-Community/MentraOS
[F1]: https://www.ray-ban.com/usa/ray-ban-meta-ai-glasses
[F2]: https://www.ray-ban.com/usa/c/frequently-asked-questions-ray-ban-meta-smart-glasses
[F3]: https://developers.meta.com/wearables/faq/
[F4]: https://about.fb.com/news/2026/05/which-meta-ai-glasses-are-right-for-you/
[R1]: https://github.com/sandeep-alluru/ER-CLI/blob/8dcdb150680fb86a6aaa8105af0d1b16e9cd4b1b/bridge/server.mjs
