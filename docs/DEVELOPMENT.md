# Development and verification

Use the [README first-run path](../README.md) for installation. Dependencies are
locked by `package-lock.json`; use `npm ci` for a clean installation.

| Command | Result |
| --- | --- |
| `npm run typecheck` | TypeScript check without emitting files |
| `npm run build` | TypeScript check, then Vite production output in `dist/` |
| `npm run pack` | Build and package `g2-claude-0.1.3.ehpk`, explicitly using SDK 0.0.14 |
| `npm run dev` | Vite on port 5173, reachable on network interfaces |
| `npm run preview` | Preview the built web assets; not an Even Hub hardware test |
| `npm run simulate` | Open the app in the desktop Even Hub simulator |
| `npm run bridge` | Run the Node bridge in the current working directory |

No repository test suite is configured. Build/typecheck and package checks prove
compilation and packaging, not an authenticated Claude response or hardware Ask.
`npm audit` reports dependency advisories; record its result separately.

## Simulator

Start Vite, then in another terminal:

```bash
npm run simulate -- --automation-port 9898
```

The desktop simulator requires a graphical session and platform libraries.
`GET http://127.0.0.1:9898/api/ping` returns `pong`;
`/api/screenshot/glasses` returns a 576 × 288 RGBA framebuffer.
Test lit pixels using alpha, not RGB: transparent and lit pixels can both have
RGB `(0,255,0)`. Allow SDK startup before sending inputs.

```bash
curl -X POST http://127.0.0.1:9898/api/input \
  -H 'Content-Type: application/json' -d '{"action":"down"}'
```

Inputs are `up`, `down`, `click`, `double_click`; no pointer or glasses keyboard.
Do not infer real hardware behavior from simulator success.

## Packaging details

The packer otherwise queries the latest SDK and may stamp a different minimum
phone-app version. `npm run pack` passes `--sdk-ver 0.0.14` to match this app;
SDK 0.0.14's npm metadata specifies minimum app 2.2.9. On an SDK upgrade, update
the dependency, manifest floor and pack script together. On an app version bump,
update the npm version, manifest version and output filename together.

Optional default for a deployment (replace the example URL):

```bash
VITE_BRIDGE_URL=https://your-bridge.example/g2 npm run pack
```

This URL is public build configuration, never a place for credentials. A saved
phone URL overrides it. `TAILNET_HOST` can allow a specific proxy hostname when
running Vite through a tailnet HTTPS proxy; it does not configure a proxy itself.

## Fresh-clone acceptance

Clone the remote into an empty directory and run the README commands. Record the
exact commit, Node/npm versions and separate results for `npm ci`,
`npm run typecheck`, `npm run build`, and `npm run pack`. Re-run after dependency
or packaging fixes. Internal acceptance evidence lives in `LAUNCH-PACKET.md`.

The original workstation helpers mentioned in agent instructions are not project
runtime dependencies. Historical notes do not establish that services are running
on a new clone.
