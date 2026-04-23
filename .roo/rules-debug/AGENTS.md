# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Debug Rules

- Auth failures are silent — if the Threads API returns `"Not Logged In"`, the code falls through to `refreshToken()` without throwing; check `generated/token.json` contents and `config/users.json` existence first
- `runningLogin = true` can get stuck if `runIgLogin()` throws before resetting it — restart the process to clear the in-memory flag
- `PROXIES` env var being unset causes Instagram-hosted videos to be served directly (no proxy fallback error, just direct URL)
- `ENVIRONMENT` not set to `"production"` means oEmbed links point to `local.milanm.cc` — embeds will fail in production if this is missing
- Rate limit key uses `req.cf_ip` (set by `cloudflare-express` middleware) — if Cloudflare middleware is not loaded, all requests share the same `req.ip` key
- Trust proxy subnet (`192.168.86.0/24`) in `src/index.ts` must match actual reverse proxy IP or `req.ip` will be wrong
- Telegram user-agent detection strips all videos (`content.video = []`) — test embed behavior with a non-Telegram UA
