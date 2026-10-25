# Measurements

The [desktop request receipt](receipts/desktop-ask.json) records one real request:
G2 Claude in Chromium → HTTP on loopback → Node bridge → installed Claude Code.
The question asks why the Moon has phases; the installed CLI returns plain text.

Browser automation timestamps the **Ask** click and its completed-answer
observation. This interval includes browser polling. The bridge records its own
CLI duration separately. These are one-sample
observations from the desktop browser and local bridge. Machine,
provider, model choice, login and network conditions affect repeat requests.

![Desktop request duration](../assets/desktop-request.svg)

The [build receipt](receipts/build.json) identifies the source inputs, package
size, SHA-256, tool versions and successful commands. `npm run check:evidence`
checks those fingerprints, the request data and media sizes/checksums. Run the
build and pack commands first; the app package is generated locally.

The desktop browser uses browser storage. Even Hub uses SDK storage on the phone.
The recorded environment is Chromium on the bridge computer, with HTTP over
loopback. [News](../README.md#news) lists the upcoming packaged-phone and G2 checks.

## Repeat a request

Follow [setup](SETUP.md), start the bridge with your existing Claude login, and
open the app with `npm run dev`. Save and test the bridge address, pair using the
bridge's current code, then send your question. A successful bridge log includes
`[ask ]` followed by `[ok ]`; the app displays the answer and elapsed time.

The recording uses HTTP on the same computer. A phone needs a reachable HTTPS
address. Follow the [connection guide](BRIDGE.md#connection-checks) for that route.
