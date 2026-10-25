# Measurements

The [desktop request receipt](receipts/desktop-ask.json) records one real request:
G2 Claude in Chromium → HTTP on loopback → Node bridge → installed Claude Code.
The request reads this repository and returns plain text. No response is mocked.

The elapsed time starts when the browser clicks **Ask** and ends when the answer
appears. The bridge records its own CLI duration separately. These are one-sample
observations, not averages, throughput claims or G2 latency measurements. Machine,
provider, model choice, login and network conditions affect repeat requests.

![Desktop request duration](../assets/desktop-request.svg)

The [build receipt](receipts/build.json) identifies the source inputs, package
size, SHA-256, tool versions and successful commands. `npm run check:evidence`
checks those fingerprints, the request data and media sizes/checksums. Run the
build and pack commands first; the app package is generated locally.

The desktop browser uses the app's browser-storage fallback. Even Hub uses SDK
storage. This demonstration does not test the installed phone WebView, its HTTPS
route, Bluetooth delivery, lens rendering or touch gestures. The installed G2
Ask path is unverified. See [connection troubleshooting](BRIDGE.md#connection-troubleshooting).

## Repeat a request

Follow [setup](SETUP.md), start the bridge with your existing Claude login, and
open the app with `npm run dev`. Save and test the bridge address, pair using the
bridge's current code, then send your question. A successful bridge log includes
`[ask ]` followed by `[ok ]`; the app displays the answer and elapsed time.

The recording uses HTTP on the same computer. A phone needs a reachable HTTPS
address. A desktop result does not establish that this route works from Even Hub.
