import { defineConfig } from 'vite'

// The dev server is reached two ways and both have to work:
//
//   • LAN        http://<lan-ip>:5173/                         (at home)
//   • Tailscale  https://<node>.<tailnet>.ts.net:8443/        (anywhere)
//
// Vite rejects unknown Host headers, so the tailnet name must be allowed or the
// proxied request returns "Blocked request".
//
// The tailnet mount is a whole HTTPS port, NOT a path prefix, and that is
// deliberate: vite injects `/@vite/client` as an absolute URL regardless of
// `base`, so under a `--set-path /app` mount the HMR client resolves to the
// tailnet root — a different proxy target — and hot reload silently dies.
// Serving at the root of its own port keeps every absolute URL correct.
// Your dev machine's tailnet name — set TAILNET_HOST or replace the placeholder.
const TAILNET_HOST = process.env.TAILNET_HOST ?? '<node>.<tailnet>.ts.net'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    allowedHosts: [TAILNET_HOST],
  },
  build: { target: 'esnext' },
})
