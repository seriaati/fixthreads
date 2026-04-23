# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Documentation Context

- The service is a metadata proxy — it fetches Threads post/user data and returns an HTML page with OG/Twitter meta tags so Discord, Telegram, etc. can embed previews; it does NOT serve a UI
- `src/types/application.d.ts` declares all shared interfaces as ambient globals — they appear used without imports throughout the codebase, which is intentional
- The `meta.ts` controller serves `/oembed` (consumed by the HTML `<link>` tag in `renderSeo.ts`) and `/health` — these are infrastructure endpoints, not user-facing
- Two video proxy strategies exist: `"ddinstagram"` type uses `kkinstagram.com` as a public proxy; `"instagram"` type uses the `PROXIES` env var hostnames (self-hosted)
- `worker.js` at the root is a Cloudflare Worker stub — it is separate from the Express app and not imported anywhere in `src/`
- The `cloudflare` npm script runs a Cloudflare tunnel, not the app itself — the app always runs on port 3000
