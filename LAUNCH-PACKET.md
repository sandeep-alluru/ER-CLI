# ER-CLI — Your Claude agent on Even G2 · INTERNAL

**A glasses-first AI interface for G2 owners: read answers on your HUD from
Claude Code running on your own computer.**

This is the product-direction packet replacing the previous launch packet.
It is for the owner of the private `sandeep-alluru/ER-CLI` repository. The app's
installed name remains **G2 Claude**, v0.1.3. The implementation is unchanged;
this rework changes positioning, comparison, documentation and the local demo.

## Owner decisions

These are explicit decisions for the owner, not approval assumed by this lane.

| Decision | Concrete choice for the owner | Current state |
| --- | --- | --- |
| Positioning | Accept **ER-CLI — Your Claude agent on Even G2**, focused on G2 owners who want their own Claude setup on their HUD | Implemented in the local README and walkthrough for review; owner acceptance outstanding |
| Approach name | Adopt **“Your agent, your bridge”** or choose different wording | **PROPOSED**; not presented as an approved brand |
| Product scope | Keep a small Claude-first app/bridge, or invest in a broader agent interface despite Even Terminal and Mentra covering parts of that space | Only Claude is implemented; no expansion assumed |
| Privacy promise | Use **no ER-CLI-hosted relay; agent process on your computer**, while acknowledging Claude provider and Even Hub dependencies | This is the evidence-supported wording; fully offline/cloud-free operation is not demonstrated |
| Hardware acceptance | Run the settling packaged Ask test with glasses and bridge console visible | Owner-only; still outstanding |
| Public flip / release | Decide whether and when to make the repo public or publish v0.1.3 | Repo remains **PRIVATE**, release remains **draft**; no publish/upload in this rework |
| Video publication | Choose whether to publish the revised local walkthrough and add hardware footage | Owner-only; footage stays in this workdir |

## Differentiator and audience

**Your agent, your bridge — PROPOSED approach name.** The owner controls a small,
inspectable bridge alongside their existing Claude Code installation, with a
G2 HUD as the reading surface. A G2 owner can connect the agent and tools they
already use rather than adopt a new bundled assistant account. Today prompts
are typed on the phone and long replies are paged with the glasses touchpad.
This is a glasses-first presentation, not a claim of hands-free prompt entry.

“Open bridge” describes source the owner can inspect and adapt in this private
repo. It does not mean the repo is public, that Claude is an open model, that
other agents already work, or that this lane settled any deferred distribution
terms. ER-CLI currently invokes `claude -p` per Ask; it is not a live-session
monitor, a voice assistant, or a general-purpose cross-glasses platform.

Agent execution and inference are different boundaries. `bridge/server.mjs`
spawns the local CLI, while Claude's documentation says model requests leave the
machine. Even Hub's docs place the app in its phone WebView and describe cloud
hosting/distribution. Consequently **“nothing in a vendor's cloud” is not an
accurate claim for today's complete stack**. ER-CLI adds no hosted relay.
[Claude data flow](https://code.claude.com/docs/en/data-usage#local-claude-code-data-flow-and-dependencies),
[Even Hub architecture][E2], [bridge implementation][R1].

## Apples-to-apples comparison

Sources checked on 2026-10-25. **PUBLISHED** = vendor product/docs/repo claims
read for this rework, not hands-on tests. **FIRST-PARTY** = ER-CLI implementation
and our recorded runs. Vendor publications are themselves primary sources;
these labels distinguish external claims from our own evidence.

Prices are advertised hardware starting prices in USD/US where specified,
not complete systems. Existing G2 ownership is an incremental-cost advantage
for ER-CLI, not free hardware. Lenses, tax, shipping, model usage, computers,
app fees and enterprise contracts are separate. Unverified charges are not zero.

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

### Findings that change the positioning

- **Even's own Terminal Mode is a direct same-G2 competitor**, not merely an
  app store. It advertises host-running agents and session input; its linked
  npm README describes host bridging and multiple providers. We read the
  actual package metadata (`npm view @evenrealities/even-terminal version` →
  `0.10.5`) and README; no competitor software was installed or tested. [E4]
- **Mentra and Brilliant cannot be called closed-only alternatives.** Mentra
  advertises customer-hosted infrastructure and AI choice; Brilliant exposes
  device/host programming. Meta also documents developer app paths even though
  its bundled Meta AI experience is vendor-controlled. [M1] [B3] [F3]
- **Frame exists as documented hardware, but not as a verified current purchase.**
  Its product page returns 404; current official price/availability is unverified.
  Dropped as a current purchasable offer, retained as a labeled legacy reference.
  No inference of formal discontinuation was made. [B4] [B5]
- All other requested competitors checked out as published offerings. Including
  Meta's Display product avoids treating a displayless $379 companion as the
  entire HUD market. [F1] [F4]

The supported claim is a focused, inspectable G2/Claude implementation. There is
no evidence for exclusive ownership of self-hosting, superior competitor
performance, fully local inference or feature parity with mature platforms.
[Detailed promises, source map and exclusions](docs/PRODUCT-COMPARISON.md).

## Honest state and the owner's settling test

| Boundary | Evidence and limit |
| --- | --- |
| HUD and pairing persistence | The repo's historical owner record reports app screens on G2 and pairing surviving exits. This rework does not add new hardware proof. |
| Text layout and pagination | Implemented in `src/glasses.ts` / `src/lib/text.ts`; historical simulator checks are in `docs/NEXT-STEPS.md`. No new physical-lens pagination claim. |
| Bridge and desktop Ask | Previous real desktop recording paired through the actual server and received a 750-character real Claude response; successful `/ask` is established for that browser/bridge path. Revised recording provides a new actual run. |
| Build and package | Fresh remote clone at `8dcdb15` passed install, separate typecheck, build, pack and audit. Existing evaluated `.ehpk` draft asset matches that build. Runtime/build inputs are unchanged by this rework. |
| Packaged Ask | **Unverified. No `/ask` code bug has been proven.** Historical packaged pairing occurred, but no `[ask ]` appeared. Desktop success cannot settle WebView networking. |
| Leading hypothesis | Network path between Even Hub WebView and phone Tailscale VPN; a hypothesis, not a diagnosed cause. No device, VPN or proxy behavior was tested in this rework. |

The settling test is the owner's: open the evaluated installed app on the paired
phone, enter the correct HTTPS bridge address, use **Save & test**, and send a
short Ask with the actual bridge console visible. Capture reachability and phone
status/error plus `[ask ]`, `[ok ]` or `[err ]`; then verify the answer on the
lenses, page a longer reply, and double-tap out. Relaunch only if demonstrating
persistence. Keep credentials and real private addresses out of shared footage.

If requests fail, inspect the HTTPS/VPN path and the vendor-documented network
permissions/CORS boundaries. The current manifest requests no permissions;
that is an observed fact, not a proven diagnosis or grounds for a speculative
fix. [Bridge hypothesis and test](docs/BRIDGE.md), [vendor request model][E2].

## Rework delivered

- Replaced the README's utility-led opening with title, headline, audience,
  differentiator, architecture boundaries and explicit experimental status.
- Replaced generic presentation exemplars as the main comparison with actual
  glasses/AI products, including the vendor's own host-agent offering.
- Added the same sourced table to the README, this packet and the comparison
  reference, with explicit evidence and price labels. The walkthrough reads
  that documentation and uses the same product story.
- Preserved prior exact install/build/package/release and original-video evidence
  in [the internal archive](docs/LAUNCH-EVIDENCE.md), clearly superseded for
  product direction. Historical observations are not silently promoted to new
  hardware evidence.
- Kept the scrubbed bridge fallback (`http://localhost:8787`) and configurable
  `VITE_BRIDGE_URL`/saved address. No tailnet-specific endpoint was introduced.
- No runtime feature or manifest changes, no dependency changes, no visibility
  changes, no remote pushes, and no uploads in this rework. Local commits are
  reviewable without publishing the material.

## Verification and existing draft

The earlier acceptance proof is preserved, not rerun against a fabricated
remote state. Exact commands from the separate fresh remote clone:

```bash
git clone git@github.com:sandeep-alluru/ER-CLI.git /tmp/er-cli-launch-proof
cd /tmp/er-cli-launch-proof
npm ci
npm run typecheck
npm run build
npm run pack
npm audit
sha256sum g2-claude-0.1.3.ehpk
```

At source commit `8dcdb150680fb86a6aaa8105af0d1b16e9cd4b1b`, Node 22.22.2 /
npm 10.9.7: install exit 0 (82 packages), distinct typecheck exit 0, Vite 8.3.5
build exit 0 (12 modules), pack exit 0 (73,849 bytes; SDK 0.0.14; minimum app
2.2.9), audit exit 0 (zero advisories). Full baseline/fix/repeat record is in the
archive. The local product rework also reran typecheck and build, both exit 0.
The walkthrough reruns the actual install/build/package commands in this workdir.

Read-only GitHub checks during rework confirmed **PRIVATE** and draft v0.1.3
with assets `g2-claude-0.1.3-launch.ehpk`, the historical original
`g2-claude-0.1.3.ehpk`, and `SHA256SUMS`. They were not modified or uploaded again.
The evaluated launch package's SHA-256 remains
`679d9d1274ec8c546085af2b1455ee11e43f424d5f717e530423f38d7c2c1707`.
The existing tag stays at prep commit `496bad4`; the evaluated package explicitly
identifies `8dcdb15` in its draft notes. No tag was moved.

Delivery starts from published-private checkpoint
`a84993d531358c006f1e8a343bee3272145dde4c`. Rework commits are local only because
the owner prohibited uploads/publication. Resolve the final local packet commit
with `git log -1 --format=%H -- LAUNCH-PACKET.md`; a commit cannot embed its own
hash in its tree. The source/runtime SHA remains `8dcdb15`, with a zero diff for
`src/`, `bridge/`, `app.json`, `index.html`, `vite.config.ts`, `package.json` and
`package-lock.json`.


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
