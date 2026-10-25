# Platforms and deployment

ER-CLI connects Even G2 to a Claude Code process on your computer. Other glasses
platforms offer bundled assistants, third-party apps or host-agent integrations.

PUBLISHED: provider specifications. FIRST-PARTY: ER-CLI functionality. Hardware
prices are the listed USD/US starting prices as of 2026-10-25; they exclude
lenses, taxes, shipping, computers, model usage and software services.

| Product / sources | Hardware | Where the AI runs | Open or closed assistant | Self-hosted bridge or vendor cloud | Extensibility | Price basis |
| --- | --- | --- | --- | --- | --- | --- |
| **ER-CLI · FIRST-PARTY** [R1] | G2 HUD + phone + your computer | Claude Code agent/tools on your computer; inference at your Claude provider | Inspectable bridge; Claude-only today, vendor model | Your Node bridge; no ER-CLI relay; Even Hub runtime still required | TypeScript HUD app and Node bridge source | G2 from $599 [E3]; computer, Claude and network costs separate |
| **Even AI + Even Hub · PUBLISHED** [E1] [E2] | G2 HUD + phone | Hub apps in phone WebView; built-in AI accessed over internet | Vendor Even AI; Hub also accepts third-party apps | Vendor AI service; individual Hub apps can use their own backends | Hub SDK and app catalogue | G2 from $599 [E3]; app/service prices vary |
| **Even Terminal Mode · PUBLISHED** [E4] [E5] | Same G2 HUD + phone + host | Coding agent on your host; model provider separate | Vendor integration; published CLI supports Claude and Codex | Host bridge; LAN/private-network or optional tunnel transport | Published CLI/provider options; host and provider options | Same G2 hardware; software fee not listed in linked specifications |
| **Brilliant Halo / Noa · PUBLISHED** [B1] [B2] | Color HUD, sensor, mics, audio + phone | On-device processing plus mobile app and cloud Noa | Programmable platform; bundled Noa is a vendor service | Noa cloud default; custom host apps possible | Lua + Python, Flutter, Web Bluetooth SDK [B3] | $399 USD; capped Noa/Miniapps included [B1] |
| **Brilliant Frame · PUBLISHED, legacy reference** [B3] [B4] | Color HUD, camera, mic + phone/host | Lua on glasses; host app supplies AI; Noa backend placement not verified | Programmable hardware; Noa companion available | App-dependent; no verified default self-hosted Noa deployment | Same host SDK; Lua device API | No current price in the linked specifications |
| **MentraOS / Mentra Live · PUBLISHED** [M1] [M2] [M3] | Live: camera/audio; G2 HUD also listed by MentraOS | Phone app runtime; AI placement depends on deployment | Programmable platform; customer chooses AI | Hosted or customer infrastructure advertised | SDK, private apps, multiple supported glasses | Live $449 [M2]; software/deployment prices separate |
| **Ray-Ban Meta Gen 2 · PUBLISHED** [F1] [F2] [F3] | Camera/audio glasses, no HUD; Meta AI phone app | Glasses capture, phone connection, Meta cloud AI | Bundled Meta AI vendor-controlled; developer apps supported | Meta cloud for bundled AI; toolkit app backends vary | Mobile Device Access Toolkit [F3] | From $379 US hardware [F1]; lenses/services separate |
| **Meta Ray-Ban Display · PUBLISHED** [F3] [F4] | HUD, camera/audio + phone + Neural Band | Bundled Meta AI service; app placement depends on integration | Vendor Meta AI plus third-party app paths | Default vendor assistant; custom app backends possible | Mobile toolkit and display Web Apps | From $799 US hardware including band [F4] |

## Even G2: three software paths

**Even AI** supplies the built-in assistant. **Even Hub** hosts third-party apps
in the phone WebView. **Even Terminal Mode** connects host-side agents to the
same G2 hardware, with live-session status and input. ER-CLI supplies a separate
Claude app and Node bridge with independent Ask calls. [E1] [E2] [E4] [E5]

## Programmable glasses

Halo combines on-device processing with the Noa cloud assistant; its $399 offer
includes capped Noa and Miniapps usage. Halo and Frame support device-side Lua
and host apps through Python, Flutter and Web Bluetooth SDKs. Frame is included
as a documented earlier hardware platform; the linked specifications do not
provide a current purchase price. [B1] [B2] [B3] [B4]

MentraOS supports phone-side apps and lists G2 among its supported devices.
Mentra advertises AI choice and deployment on customer infrastructure. Its
$449 Live model is a camera/audio product; that price does not include G2
hardware. [M1] [M2] [M3]

## Meta companions

Ray-Ban Meta Gen 2 supplies camera/audio and the Meta AI companion experience.
Meta Ray-Ban Display adds a HUD and Neural Band at a different hardware price.
Meta AI uses vendor cloud services, while developer app paths can connect to
other backends. The Device Access Toolkit supports mobile integrations;
display Web Apps are specific to the Display model. [F1] [F2] [F3] [F4]

## ER-CLI deployment

The bridge and agent process run on your computer. The app runs in Even Hub's
phone WebView and renders text on G2 over Bluetooth. Claude model requests use
your configured provider. ER-CLI has no hosted relay, but still depends on
Even Hub and your model service. It does not provide a local model, cross-glasses
runtime or multi-agent session manager.
[Claude data flow](https://code.claude.com/docs/en/data-usage#local-claude-code-data-flow-and-dependencies).

[E1]: https://www.evenrealities.com/ai-glasses
[E2]: https://hub.evenrealities.com/docs/get-started/architecture
[E3]: https://www.evenrealities.com/store
[E4]: https://www.evenrealities.com/terminal
[E5]: https://www.npmjs.com/package/@evenrealities/even-terminal/v/0.10.5
[B1]: https://brilliant.xyz/products/halo
[B2]: https://brilliant.xyz/
[B3]: https://github.com/brilliantlabsAR/brilliant_sdk
[B4]: https://docs.brilliant.xyz/frame/hardware/
[M1]: https://mentraglass.com/
[M2]: https://mentraglass.com/live
[M3]: https://github.com/Mentra-Community/MentraOS
[F1]: https://www.ray-ban.com/usa/ray-ban-meta-ai-glasses
[F2]: https://www.ray-ban.com/usa/c/frequently-asked-questions-ray-ban-meta-smart-glasses
[F3]: https://developers.meta.com/wearables/faq/
[F4]: https://about.fb.com/news/2026/05/which-meta-ai-glasses-are-right-for-you/
[R1]: https://github.com/sandeep-alluru/ER-CLI/blob/8dcdb150680fb86a6aaa8105af0d1b16e9cd4b1b/bridge/server.mjs
