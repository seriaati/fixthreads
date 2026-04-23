# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Architectural Constraints

- Controllers must never return 4xx/5xx to clients — all errors redirect to `threads.com`; the only exception is `/oembed` and `/health` which are internal endpoints consumed by the HTML meta layer
- `HttpError` thrown in controllers reaches the global handler in `src/index.ts` only if passed via `next(err)` — controllers that `throw` directly will crash the process in Express 5
- Auth state is entirely in-memory (`tokenStore`) plus `generated/token.json` on disk — there is no database; horizontal scaling requires shared token storage or sticky sessions
- The `runningLogin` flag is a process-level mutex — multiple concurrent auth failures will queue behind it; this is intentional to avoid credential lockouts
- `renderSeo.ts` truncates descriptions to 253 chars only when a video is present — this is a Discord embed character limit workaround, not a general rule
- Telegram embeds intentionally receive no video (stripped by user-agent check in `renderSeo.ts`) because Telegram does not support `twitter:player`
- The oEmbed endpoint is self-referential: `renderSeo.ts` generates a `<link>` pointing back to `/oembed` on the same host, which Discord/Slack then fetches to get author/stats metadata
