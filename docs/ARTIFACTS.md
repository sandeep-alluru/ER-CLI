# Build artifacts

The ER-CLI distributable contains the G2 app. The Node bridge invokes your
installed Claude Code; your CLI configuration determines the model and provider.

| Artifact | Source | Identity | Changes |
| --- | --- | --- | --- |
| G2 Claude `.ehpk` | App sources in this repository | [Size and SHA-256](receipts/build.json) | Vite compilation and Even Hub packaging |
| Even Hub SDK | `@evenrealities/even_hub_sdk` | Version and npm integrity in [lockfile](../package-lock.json) | Used as an npm dependency |
| Pretext | `@evenrealities/pretext` | Version and npm integrity in [lockfile](../package-lock.json) | Glyph measurement dependency |
| Claude model | Your configured Claude provider | Provider-managed | CLI request only |

```bash
npm ci
npm run typecheck
npm run pack
npm run check:evidence
```

The package command explicitly selects SDK 0.0.14. The app manifest and package
require that SDK version and Even app 2.2.9. The distributable is
`g2-claude-0.1.3.ehpk`. Media checksums are in [SHA256SUMS](../assets/SHA256SUMS).
Release downloads have a separate `SHA256SUMS` covering the package and videos.

[Even Hub CLI](https://www.npmjs.com/package/@evenrealities/evenhub-cli) ·
[Measurement method](BENCHMARKS.md)
