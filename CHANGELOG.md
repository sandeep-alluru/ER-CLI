# Changelog

## 0.1.3

### App

- G2 Claude phone form for pairing, bridge-address configuration and Ask.
- Text wrapping and pagination for the 576 × 288 HUD.
- Touchpad page navigation and double-tap exit.
- Device state stored through the Even Hub SDK.

### Bridge

- Local Claude CLI invocation for each prompt.
- Single-use pairing codes and device-token authentication.
- HTTP health, pairing, Ask and diagnostics endpoints.

### Build

- Locked npm dependencies and a separate `npm run typecheck` command.
- SDK 0.0.14 packaging with minimum Even app 2.2.9.
- Output package: `g2-claude-0.1.3.ehpk`.

### Known limitations

- The installed phone-to-glasses Ask path remains unverified.
- No shared session, voice input or live-session steering.
- Claude inference uses the configured model provider; ER-CLI does not include
  a local model.
