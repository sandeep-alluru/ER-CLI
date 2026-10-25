# ER-CLI launch packet — INTERNAL

This packet is internal to the private repository. It records the launch
evaluation, not approval to publish or a claim of complete hardware operation.

## Current state and HEAD

- Repository: `sandeep-alluru/ER-CLI`, default branch `master`; GitHub reported
  **PRIVATE** during this evaluation. Visibility was not changed.
- Evaluated source HEAD: `8dcdb150680fb86a6aaa8105af0d1b16e9cd4b1b`.
  The fresh clone, desktop pairing capture and launch package correspond to this
  tree. Subsequent packet/demo documentation commits do not change runtime inputs.
- Final delivery HEAD is the commit containing the final version of this packet:
  resolve it with `git log -1 --format=%H -- LAUNCH-PACKET.md`. This avoids the
  impossible self-reference of embedding a commit's own hash inside its tree.
  `git rev-parse HEAD` identifies the checked-out delivery state; compare it to
  `git ls-remote origin refs/heads/master` to verify the pushed checkpoint.
- Manifest: `com.aitiuminc.g2claude`, display name G2 Claude, v0.1.3, SDK floor
  0.0.14 and minimum phone app 2.2.9. No new hardware test took place.
- The initial execution attempt failed at sandbox startup; no files were changed
  then. After the launch configuration was repaired, this evaluation restarted.
  The old workstation onboarding helper is absent here; it was not treated as a
  runtime dependency. Temporary verification processes are stopped after capture.

## Comparable-project review

The following public sources were actually opened, rather than inferred from
project reputation. These are presentation comparisons, not claims of feature
parity or performance.

| Source | Observations | Lesson applied |
| --- | --- | --- |
| [ThatCrispyToast/g2-claude-remote](https://github.com/ThatCrispyToast/g2-claude-remote) | Direct G2 companion/bridge comparator: opening explanation of HUD, phone panel and bridge; short install/run/connect path with concrete command and config location; private-network caution; separate server guide; About description and relevant topics. | State which component runs where; make first run ordered; describe ER-CLI's simpler independent Ask invocations honestly. |
| [scrcpy README](https://github.com/Genymobile/scrcpy/blob/master/README.md) | Immediate device/host explanation, real screenshot, prerequisite section, platform install links, usage examples and focused reference pages. | Put real app purpose and capture near the top, requirements before commands, detailed reference outside the first-run path. |
| [scrcpy v5.0.1 release](https://github.com/Genymobile/scrcpy/releases/tag/v5.0.1) | Changes since previous release link to issues; highlights explain affected user configurations. | Tie draft notes to observed packaging and dependency changes, with precise limitations. |
| [GitHub CLI README](https://github.com/cli/cli/blob/trunk/README.md) and [v2.103.2 release](https://github.com/cli/cli/releases/tag/v2.103.2) | Product sentence and terminal screenshot, install/manual separation, platform/source paths, artifact verification; release fixes link to PRs and full comparison. About panel supplies concise purpose and product URL. | Use source and checksum provenance, distinguish installation/build/usage, keep metadata useful and release claims traceable. |
| [Home Assistant Android README](https://github.com/home-assistant/android/blob/main/README.md) and [first-run guide](https://companion.home-assistant.io/docs/getting_started/) | Companion relationship, install and docs links; requirements then numbered connection/login steps with screenshots and manual-address fallback. | Explain phone versus server reachability, show the exact settings and success signal at each boundary. |

### Concrete ER-CLI gaps found at starting HEAD 496bad4

1. README opened as G2 Claude while the repo is ER-CLI; npm still identified
   `evenhub-minimal@0.1.0`. Aligned repo/product names and npm version with 0.1.3.
2. README's install commands came after bridge/proxy instructions; it omitted a
   Node requirement and separate typecheck command. Reordered and documented them.
3. `npm install` left reproducibility ambiguous despite the new lockfile. The
   documented path now uses `npm ci`, exercised from two remote clones.
4. No README product screenshot; the existing portal image is a v0.1.0 upload,
   not an Ask demo. Added an actual desktop pairing screenshot and provenance.
5. `AGENTS.md` and `CLAUDE.md` still claimed template manifest IDs and current
   workstation tool availability. Updated identity/manifest and marked tool
   history; preserved the managed identity block. Historical resume notes now
   have a warning banner and links to current setup.
6. Phone HTTPS setting, localhost fallback, health-versus-Claude distinction,
   local Unpair versus server revocation, and expected bridge logs needed a
   coherent explanation. Added ordered first run and `docs/BRIDGE.md`.
7. Baseline `npm run pack` queried latest SDK 0.0.16 and silently raised the
   packaged minimum phone app to 2.2.10. Explicit `--sdk-ver 0.0.14` now yields
   2.2.9, matching the manifest and installed SDK npm metadata.
8. Baseline install/audit reported three high-severity dependencies. `npm audit
   fix` updated the lockfile within declared ranges; Vite is now 8.3.5,
   source-map-js 1.2.2 and zod 4.6.7. Final audit reports zero advisories. This is
   dependency-tool evidence, not a full security assessment.
9. GitHub About had no topics and described the project only as superseded build
   notes. Added accurate experimental purpose, outstanding Ask status and topics:
   even-realities, smart-glasses, claude-code, typescript, device-bridge.
10. Draft release contained an older package without fresh-clone provenance.
    Added a separately named evaluated build plus checksums, preserved the
    historical original and tag, and explained the distinction in draft notes.

## Changes and evidence

Checkpoint `8dcdb15` contains the README, references, `.env.example`, desktop
screenshot, contributor-doc corrections, npm metadata/typecheck/pack scripts and
updated lockfile. No app runtime or bridge logic was changed. The Vite update
changes generated assets, so the launch package was rebuilt rather than claiming
that the old binary matched.

`docs/DEMO.md` identifies the screenshot as actual Chromium desktop UI at
480 × 700; capture waited for the real pairing button and expanded Bridge
address. No form markup or bridge response was substituted; no uncaught page
errors occurred. This does not show an answer or a lens framebuffer.

## Fresh-clone proof

Environment: Linux x64, Node `v22.22.2`, npm `10.9.7`.

Baseline commands, all run from a separate clone:

```bash
git clone git@github.com:sandeep-alluru/ER-CLI.git /tmp/er-cli-launch-baseline
cd /tmp/er-cli-launch-baseline
npm ci
npm run build
npx tsc --noEmit
npm run pack
npm audit --json
```

At `496bad4966ad1a185071cc9d1d9df175cf58ee3f`: install exited 0 (82 packages),
build exited 0 (12 modules), distinct `npx tsc --noEmit` exited 0. Pack exited 0
but warned and stamped minimum app 2.2.10 from latest SDK 0.0.16, despite installed
SDK 0.0.14. Audit reported three high-severity dependencies. Both gaps were fixed
in the pushed checkpoint before repeating acceptance.

Final commands from another fresh **remote** clone:

```bash
git clone git@github.com:sandeep-alluru/ER-CLI.git /tmp/er-cli-launch-proof
cd /tmp/er-cli-launch-proof
git rev-parse HEAD
node --version
npm --version
npm ci
npm run typecheck
npm run build
npm run pack
npm audit
sha256sum g2-claude-0.1.3.ehpk
npm ls --depth=0
```

Results at `8dcdb150680fb86a6aaa8105af0d1b16e9cd4b1b`:

| Check | Observed result |
| --- | --- |
| Install | Exit 0; added 82 packages, audited 83; zero advisories |
| Distinct typecheck | `tsc --noEmit`, exit 0, no diagnostics |
| Build | Exit 0; Vite 8.3.5, 12 modules; `dist/index.html` and `dist/assets/index-BLwx4swv.js` |
| Package | Exit 0; 73,849 bytes; SDK 0.0.14, minimum app 2.2.9; no SDK-floor warning |
| Audit | Exit 0; zero advisories |
| Dependencies | SDK 0.0.14; pretext 0.1.4; CLI 0.1.14; simulator 0.7.3; TypeScript 5.9.3; Vite 8.3.5 |
| Package provenance | Fresh-clone package hash equals the package independently built in the main workdir |

Launch package SHA-256:
`679d9d1274ec8c546085af2b1455ee11e43f424d5f717e530423f38d7c2c1707`.
No test suite is configured; these checks do not establish hardware behavior.

## Draft v0.1.3 release

Release ID `423436637`, still draft. The original `v0.1.3` annotated tag points
at preparation commit `496bad4`; it was preserved rather than rewritten.

| Asset | Meaning | SHA-256 |
| --- | --- | --- |
| `g2-claude-0.1.3-launch.ehpk` | Evaluated fresh-clone build at `8dcdb15`; recommended evaluation asset | `679d9d1274ec8c546085af2b1455ee11e43f424d5f717e530423f38d7c2c1707` |
| `g2-claude-0.1.3.ehpk` | Original 74,171-byte historical prep package; not claimed to match the evaluated source | `e48140bdfa21e97d720c93795a0f80bc0c84ddd272404bf73672fc26ff75850b` |
| `SHA256SUMS` | Checksums for both packages | Plain-text provenance accompanying the assets |

Draft notes explicitly identify evaluated source commit and build commands;
the tag's source archive remains the older prep tree. This difference is
intentional and must remain visible if the owner later publishes. No release
publication or visibility change was performed. No video is uploaded with it.

## Launch-readiness assessment

The documented install/build/package path is reproducible on the checked Linux
Node/npm environment. Presentation now explains the actual app and its known
limits. This supports evaluation as an **experimental private build**; it does
not support an unqualified claim of a working packaged glasses Ask round-trip.
Other operating systems, a fresh user's Claude account, production TLS/proxy
configuration and packaged phone networking were not validated here.

The historical notes report installation, persistence and app screens on the
owner's glasses. They also record a later successful third-party app; that is
not an ER-CLI acceptance result. The live Tailscale configuration was not changed.

## Owner-only items — still outstanding

- **Private-to-public decision:** exclusively the owner's. Repository remains
  private; draft release remains unpublished.
- **Packaged on-glasses Ask round-trip:** owner runs **Save & test**, pairs if
  needed, asks a short question with the bridge log visible, confirms the phone
  response and lens answer, then scrolls a multi-page answer and double-taps out.
  If Ask fails, record the phone error and whether `[ask ]` appears, without
  recording credentials. This lane does not attempt to close it without glasses.
- **On-glasses video capture:** the desktop walkthrough cannot show the actual
  packaged phone WebView, SDK persistence, or lens receipt/paging. The owner must
  record those views with his hardware and explicitly connect the same Ask to
  the bridge's success log. Local video publication is the owner's alone.
