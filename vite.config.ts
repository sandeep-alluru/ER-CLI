import { defineConfig } from 'vite'

// The dev server is reached two ways and both have to work:
//
//   • LAN        http://192.168.68.64:5173/                    (at home)
//   • Tailscale  https://<node>.tail1306c8.ts.net:8443/        (anywhere)
//
// Vite rejects unknown Host headers, so the tailnet name must be allowed or the
// proxied request returns "Blocked request".
//
// The tailnet mount is a whole HTTPS port, NOT a path prefix, and that is
// deliberate: vite injects `/@vite/client` as an absolute URL regardless of
// `base`, so under a `--set-path /app` mount the HMR client resolves to the
// tailnet root — a different proxy target — and hot reload silently dies.
// Serving at the root of its own port keeps every absolute URL correct.
const TAILNET_HOST = 'clawer-samurai-1.tail1306c8.ts.net'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    allowedHosts: [TAILNET_HOST],
  },
  build: { target: 'esnext' },
})
