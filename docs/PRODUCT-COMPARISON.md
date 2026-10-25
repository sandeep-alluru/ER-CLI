# Product comparison — ER-CLI and the glasses ecosystem

Reviewed 2026-10-25 against actual vendor pages and repositories. This is a
comparison of product promises and architecture, not hands-on competitor testing.
ER-CLI is an app for someone who already owns G2, not a new glasses platform.

**PUBLISHED:** externally published vendor claims. **FIRST-PARTY:** this repo's
implementation and recorded checks. Vendor sources are primary publications;
the labels distinguish them from our own verification. Prices are the displayed
USD/US hardware starting prices where stated. Prescription lenses, taxes,
shipping, computers, model usage and software/deployment contracts can add cost.
Unverified fees are not treated as zero. No checkout or purchase was performed.

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

## What the products promise, and what checked out

- **Even AI / Even Hub:** vendor AI answers and contextual assistance, plus a
  third-party app ecosystem. The architecture document places Hub logic in the
  phone WebView and distribution/hosting in Even Hub Cloud. Its AI page says
  internet access through the phone is needed. The G2 store lists from $599.
  **Do not call the whole Hub ecosystem a closed assistant.** [E1] [E2] [E3]
- **Even Terminal Mode:** the direct same-hardware benchmark. Its product page
  describes host-running agents, live status, session input and QR pairing.
  The linked npm package was read with `npm view @evenrealities/even-terminal
  readme`; version 0.10.5 describes a host renderer/input bridge and multiple
  agent providers. It offers private-network and optional tunnel transports.
  We read it; we did not install or test it. [E4]
- **Brilliant Halo:** the store lists $399 and says shipping now, with capped
  Noa and Miniapps included. The site describes local processing hardware and
  a cloud agent with a mobile companion. The shared SDK repo exposes both Halo
  and Frame device/host programming. Programmability does not prove that Noa's
  hosted service can be self-hosted. [B1] [B2] [B3]
- **Brilliant Frame:** the hardware and companion docs and shared SDK remain
  available, verifying a real programmable product. The current product URL
  returns 404. **Dropped as a verified current purchasable offer**; retained
  only as a labeled legacy reference. No current price, discontinuation claim
  or self-hosted Noa deployment was inferred from that 404. [B3] [B4] [B5]
- **Mentra:** its website promises AI choice and customer infrastructure; Live
  is listed at $449. MentraOS documents phone-side runtime and lists G2 among
  supported glasses. The Live camera/audio price is not a HUD price. These
  are published capabilities, not deployments we verified. [M1] [M2] [M3]
- **Ray-Ban Meta Gen 2:** hands-free camera, audio and Meta AI companion are the
  mass-market reference. Ray-Ban's FAQ describes photo queries processed in
  Meta's cloud. Its US catalogue lists Gen 2 from $379. **Bundled Meta AI is
  vendor-controlled; the platform is not extension-free**: Meta documents
  mobile developer APIs. [F1] [F2] [F3]
- **Meta Ray-Ban Display:** included to avoid comparing a G2 HUD only against
  displayless products. Meta lists it from $799 including its band, with a
  display and developer app paths. That extra hardware and app capability is
  not a claim that ER-CLI supplies it. [F3] [F4]

## What this means for ER-CLI

**Your agent, your bridge — PROPOSED positioning name.** The useful promise is
an inspectable G2 HUD app connected to the owner's Claude setup through their
own small Node bridge. It is a focused implementation, not evidence of superior
hardware, exclusive self-hosting, cross-platform support or full offline AI.
The repository remains private; “open bridge” describes source the owner can
inspect and adapt, not public availability or an open Claude model.

Claude Code's own documentation distinguishes local agent execution from remote
model requests. ER-CLI does not add its own hosted relay; it still depends on
Even Hub's runtime/distribution and the user's Claude model service. This is why
“nothing in a vendor cloud” is not a truthful description of today's whole stack.
[Claude Code data flow](https://code.claude.com/docs/en/data-usage#local-claude-code-data-flow-and-dependencies).

No other requested competitor was dropped as nonexistent. None was represented
as hardware-tested here. The earlier scrcpy/GitHub CLI/Home Assistant review
was useful for documentation craft; it was not the relevant product market.

## Source map

The row links above lead to the actual primary pages. The following specific
checks keep similarly named products and services distinct:

- Even built-in AI, Hub and Terminal Mode are separate offerings on the same G2.
  The AI page's ChatGPT mention is marked for G1; it was not attributed to G2.
- Brilliant's current `brilliant_sdk` repository supports Halo and Frame; a
  guessed hyphenated repository name is not the source used in this comparison.
- Meta's regular Gen 2 is camera/audio; Display is a different hardware product.
- Mentra's current public pitch includes customer-hosted infrastructure; its
  architecture must not be flattened to “vendor cloud only.”

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
