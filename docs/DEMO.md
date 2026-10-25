# Demo evidence

![G2 Claude pairing form captured in a desktop browser](assets/desktop-pairing.png)

This is a screenshot of the actual `src/phone.ts` pairing form served by Vite,
opened in headless Chromium at 480 × 700. **Bridge address** is expanded; no
pairing code or device token has been entered. The localhost address is the
desktop development default, not a usable packaged-phone deployment address.

Capture method: install the lockfile with `npm ci`, start `npm run dev`, open
`http://127.0.0.1:5173`, wait for **Pair this phone**, expand **Bridge address**,
and capture the page. The capture reported no uncaught page errors. No app
markup was substituted. This demonstrates the desktop pairing screen only.

## Walkthrough story

The [README](../README.md) is the runnable script: install dependencies, check
compilation, start the bridge, check health, configure the reachable bridge
address, package/install, pair, then Ask. The detailed desktop walkthrough video
is an owner-controlled local launch asset; it must not be uploaded with releases
or committed to Git. Its exact filename, duration and observed coverage are
recorded in the internal `LAUNCH-PACKET.md` after capture.

A desktop capture cannot show the packaged phone WebView reaching the bridge,
SDK persistence across app exits, or an answer reaching a lens. The owner must
record that final boundary on his own phone and glasses. Hardware evidence in
[the archived notes](NEXT-STEPS.md) is historical; third-party-app success is
separate from ER-CLI.

The existing root `g2-claude-uploaded.png` shows a portal upload of **v0.1.0**.
It is historical upload evidence, not a current app demonstration or proof of
v0.1.3's Ask flow, so it is not used as the README's product screenshot.
