# even-realities — Even Realities G2 glasses app

Vite + TypeScript + Even Hub SDK. Scaffolded from the official
`even-realities/evenhub-templates` **minimal** template on 2026-08-26.

## Hardware facts (verified against vendor docs / reviews, 2026-08-26)

- Display: **576 × 288** monochrome green micro-LED waveguide, one per lens.
  Screenshots from the simulator are RGBA PNGs at exactly this size.
- **No camera, no speaker.** Do not design features that assume either.
- Input: temple touchpads (`up` / `down` / `click` / `double_click`) and the
  optional **R1 ring**. There is no pointer and no keyboard.
- Pairs to a phone over Bluetooth; the phone runs the Even Hub companion app,
  which is what actually loads your web app.

## Toolchain (all verified working on this box)

| Thing | Version | Where |
|---|---|---|
| `@evenrealities/even_hub_sdk` | 0.0.14 | project dep |
| `@evenrealities/evenhub-cli` | 0.1.14 | global (`evenhub`, `eh`) |
| `@evenrealities/evenhub-simulator` | 0.9.3 | global (`evenhub-simulator`) |
| `vite` | 8.2.2 | project devDep |
| Claude Code plugin `everything-evenhub` | 0.0.1 | user scope, 13 skills |

**npm caret trap:** the template shipped `"@evenrealities/even_hub_sdk": "^0.0.10"`.
On `0.0.x` versions a caret allows **no** upgrades (`^0.0.10` === `>=0.0.10 <0.0.11`),
so a plain `npm install` silently pins the SDK 4 releases behind. This was corrected
to `0.0.14` and `app.json`'s `min_sdk_version` was synced to match. If you ever bump
the SDK, bump `min_sdk_version` in `app.json` in the same commit.

## Commands

```bash
npm run dev        # vite dev server on :5173
npm run build      # tsc --noEmit && vite build  -> dist/
npm run pack       # build + evenhub pack app.json dist  -> .ehpk
```

### Test in the simulator

```bash
npm run dev
evenhub-simulator --automation-port 9898 http://localhost:5173
```

The `--automation-port` flag is what lets Claude Code drive the simulator
headlessly. Base URL `http://127.0.0.1:9898`:

| Route | Purpose |
|---|---|
| `GET /api/ping` | health, returns `pong` |
| `GET /api/screenshot/glasses` | 576×288 **RGBA** PNG of the glasses framebuffer |
| `GET /api/screenshot/webview` | companion webview, via html2canvas |
| `GET /api/console?since_id=N` | console + uncaught errors + failed fetches |
| `DELETE /api/console` | clear buffer |
| `POST /api/input` | `{"action":"up"\|"down"\|"click"\|"double_click"}` |

**Screenshot gotcha:** keep the image in RGBA. Background pixels are
`(0,255,0,alpha=0)` and lit pixels are `(0,255,0,alpha=255)` — identical in RGB.
The lit test is `pixel[3] > 0`, never a color comparison.

Allow ~4s after launching the simulator before polling; SDK init and
`createStartUpPageContainer` take time. Input is silently ignored if no event
container is active.

### Test on the real glasses

```bash
npm run dev
evenhub qr --url http://<this-machine-LAN-ip>:5173
```

Scan with the Even Hub companion app on the paired phone. Use the **LAN** IP,
not `localhost` — the phone has to reach this machine.

## Event routing (the part that bites)

`CLICK_EVENT` is `0`, and protobuf omits zero-value fields, so a single tap
arrives with `eventType === undefined`. The default must be resolved *inside*
the envelope check — see the comment block in `src/main.ts`. Writing
`event.sysEvent?.eventType ?? CLICK_EVENT` at the top level makes every scroll,
exit and audio frame fire the tap handler.

Taps/lifecycle arrive on `event.sysEvent`; scroll gestures on `event.textEvent`.
Check `DOUBLE_CLICK_EVENT` before `CLICK_EVENT`.

## Before shipping

`app.json` still has the template's placeholder `package_id`
(`com.example.evenhubminimal`) and `name`. Change both to something you own
before packing or publishing.
