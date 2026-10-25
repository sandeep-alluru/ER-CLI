# ER-CLI — Your Claude agent on Even G2 · walkthrough

**A glasses-first AI interface for G2 owners: read answers on your HUD from
Claude Code running on your own computer.**

The current local launch asset is **`ER-CLI-desktop-walkthrough.mp4`**:
**4 minutes 19.88 seconds**, H.264 at 1600 × 900 / 25 fps. It is silent, with
readable on-screen explanations and 13 embedded chapter markers. It replaces
the earlier 2:30.84 walkthrough at the same path; the original remains in the
ignored local capture archive. Nothing was uploaded or published in this rework.

## Product story, then actual operation

The opening shows the real README title/headline, the sourced comparison with
Even AI/Hub, Even Terminal Mode, Brilliant Halo/Frame, Mentra and Meta, and
**“Your agent, your bridge” — PROPOSED approach name**. The table distinguishes
PUBLISHED vendor claims from FIRST-PARTY ER-CLI evidence. These are documentation
screens, not fabricated competitor app demonstrations.

The rest records real commands and the actual desktop app: dependency install,
typecheck, build, package, local bridge settings/startup, health check, Vite,
saving/testing the bridge URL, pairing, and a successful actual Claude Ask.
The returned answer describes the product's architecture and outstanding
hardware test. No bridge response, SDK behavior or agent answer was mocked.

| Start | Chapter |
| --- | --- |
| 0:00 | ER-CLI — Your Claude agent on Even G2 |
| 0:25 | Compare the choices / Same G2 and programmable HUDs |
| 0:55 | Compare the choices / Open platforms and mass-market companions |
| 1:25 | Your agent, your bridge / PROPOSED approach name |
| 1:51 | 1 / Install the G2 app and bridge source |
| 2:03 | 2 / Check types, build and package |
| 2:27 | 3 / Connect your own Claude setup |
| 2:38 | 4 / Start the real app in a desktop browser |
| 2:48 | 5 / Save and test the bridge address |
| 3:03 | 6 / Pair this browser to the actual bridge |
| 3:17 | 7 / Ask Claude through the actual bridge |
| 3:36 | 8 / Read the real response and bridge success log |
| 4:00 | 9 / Owner test: packaged WebView → bridge → glasses |

Read the [README](../README.md) for commands and the
[comparison reference](PRODUCT-COMPARISON.md) for source links, price basis and
capability limits. The internal `LAUNCH-PACKET.md` records the video's checksum,
exact observed request result, capture method and owner decisions.

## Evidence boundaries

Capture starts from an existing authenticated checkout and installed Node/Claude
prerequisites. The video shows desktop HTTP only. It does not show Git or Claude
installation/login, HTTPS proxy setup, portal upload, a packaged phone WebView,
SDK persistence or physical glasses. Expected desktop SDK warnings remain
visible. The app's “now on your glasses” message is explicitly qualified in the
recording; it is not evidence of lens receipt.

No `/ask` code bug is proven. The leading hypothesis for the historical packaged
failure is the WebView/VPN network path. The owner must perform
[the settling test](BRIDGE.md#packaged-ask-hypothesis-and-settling-test) with his
phone/glasses and the real bridge console in view, then film the lens answer,
paging and exit. The owner alone decides whether to publish any footage.

## Existing screenshot provenance

![Actual G2 Claude pairing form captured in a desktop browser](assets/desktop-pairing.png)

This screenshot is the unchanged real `src/phone.ts` pairing form served by Vite,
opened in headless Chromium at 480 × 700. Bridge address is expanded; no code or
token has been entered. The localhost address is the desktop default, not a
packaged phone deployment address. Capture waited for **Pair this phone**,
expanded Bridge address, and reported no uncaught page errors.

The root `g2-claude-uploaded.png` shows an older portal upload of v0.1.0. It is
historical upload evidence, not the current product demo or v0.1.3 Ask proof.
