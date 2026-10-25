# Development and verification

Use the [setup guide](SETUP.md) for installation. Dependencies are
locked by `package-lock.json`; use `npm ci` for a clean installation.

| Command | Result |
| --- | --- |
| `npm run typecheck` | TypeScript validation |
| `npm run build` | TypeScript check, then Vite production output in `dist/` |
| `npm run pack` | Build and package `g2-claude-0.1.3.ehpk`, explicitly using SDK 0.0.14 |
| `npm run dev` | Vite on port 5173, reachable on network interfaces |
| `npm run preview` | Serve the compiled web app locally |
| `npm run simulate` | Open the app in the desktop Even Hub simulator |
| `npm run bridge` | Run the Node bridge in the current working directory |

Build/typecheck checks compilation; packaging produces the installable app.
`npm run check:evidence` validates source, package and media fingerprints.
`npm audit` checks the dependency tree for published advisories.

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

Inputs are `up`, `down`, `click`, `double_click`, matching touchpad gestures.
Installed hardware checks are listed in [News](../README.md#news).

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
running Vite through a tailnet HTTPS proxy. Configure that proxy separately.

## Clean build

```bash
npm ci
npm run typecheck
npm run build
npm run pack
npm audit
```

`npm run pack` creates `g2-claude-0.1.3.ehpk`. Continue with the [setup guide](SETUP.md)
for phone installation and authenticated Ask, and the [bridge guide](BRIDGE.md)
for connection checks.

[SDK package metadata](https://www.npmjs.com/package/@evenrealities/even_hub_sdk/v/0.0.14) ·
[Simulator](https://www.npmjs.com/package/@evenrealities/evenhub-simulator) ·
[App manifest](../app.json) · [Bridge defaults](../bridge/server.mjs).
