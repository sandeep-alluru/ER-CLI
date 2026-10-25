# Install and connect ER-CLI

## 1. Install the project

You need Git, Node **20.19+ within 20.x, or 22.12+**, npm, and access to this
repository. The CLI and optional desktop simulator are local dependencies; global
Even Hub tooling is unnecessary. The Node range follows [Vite](https://vite.dev/guide/)
and the [package requirements](../package.json).

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

## 2. Start the bridge

From the repository root, leave this terminal running:

```bash
npm run bridge
```

It prints its loopback address and a **single-use pairing code**, valid for five
minutes. Restart the bridge to get a new code if one expires or was already used.
Claude runs with the bridge process's working directory and existing login.

In another terminal, check liveness:

```bash
curl --silent --show-error http://127.0.0.1:8787/health
# {"ok":true,"service":"g2-claude-bridge"}
```

The health response confirms HTTP reachability. Ask exercises Claude Code and
its existing login. Prompts can use Claude Code tools on this computer.

## 3. Give the phone an HTTPS bridge address

Give the installed app an **HTTPS** bridge URL reachable from the phone. Keep
the bridge bound to loopback and put an HTTPS proxy in front of it. On the phone,
`localhost` addresses the phone itself.

One option is [Tailscale Serve](https://tailscale.com/kb/1242/tailscale-serve):
with Tailscale configured on both computer and phone, run on the computer:

```bash
tailscale serve --bg --set-path /g2 http://127.0.0.1:8787
```

Use the actual HTTPS URL printed by Serve, including `/g2`. The phone must be
connected to the same tailnet. Check existing Serve routes before changing them.
Another HTTPS proxy is fine if it forwards `/health`, `/pair`, `/ask`, `/log`
and CORS preflight requests. [Bridge configuration and troubleshooting](BRIDGE.md).

## 4. Package and install G2 Claude

```bash
npm run pack
# creates g2-claude-0.1.3.ehpk
```

Upload the package in your project's **Private builds** in the Even Hub portal,
then install it in the phone app: **Even Hub → Me → Apps → Private builds**.
Use the same account on the portal and phone. See the vendor's
[Private Testing guide](https://hub.evenrealities.com/docs/test/private-testing).
The package name is `com.aitiuminc.g2claude`; its display name is **G2 Claude**.

## 5. Pair and Ask

1. Open **G2 Claude** in Even Hub on the phone.
2. Expand **Bridge address**, enter your computer's HTTPS bridge URL, and tap
   **Save & test**. Continue when it reports **Reachable**. The packaged fallback
   is `http://localhost:8787`; replace it before pairing.
3. Enter the fresh code from the bridge terminal and tap **Pair this phone**.
   The phone stores its token and bridge address through the Even Hub SDK.
4. Type a short question and tap **Ask**. The phone shows **Thinking…**, followed
   by the answer or an error. Watch the bridge for `[ask ]` and `[ok  ]` or `[err ]`.
5. The answer is sent to the glasses. Scroll down/up to turn pages; double-tap
   exits. Upcoming hardware checks cover this installed path; see [News](../README.md#news).

The app accepts a build-time `VITE_BRIDGE_URL` as an alternative default; a saved
phone address takes precedence. Keep bearer tokens and pairing codes private.
The phone's **Unpair** clears its local token; server-side revocation is separate.


[Bridge settings and connection troubleshooting](BRIDGE.md).
