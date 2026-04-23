# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Coding Rules

- All global interfaces (`ContentProps`, `DataProps`, `VideoProps`, `ImageProps`, `QuotedPostProps`, `OembedPostProps`) are ambient globals from `src/types/application.d.ts` — never import them
- Use `HttpError` from `src/utils/utils.ts` to propagate errors to the global handler; throwing plain `Error` bypasses the structured JSON error response
- Controllers must **redirect** to `threads.com` on not-found/error — never return 4xx to the client (embeds break silently otherwise)
- `runningLogin` flag in `src/utils/fetch/igLogin.ts` is a concurrency guard — do not call `runIgLogin()` directly, always go through `login()`
- `PROXIES` env var is comma-separated hostnames (no protocol); `renderSeo.ts` prepends `https://` and appends the encoded video URL path
- Post code → numeric ID conversion uses a custom base64 alphabet (`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`) — never use `atob` or standard base64
- Module system is `NodeNext` — new relative imports require `.js` extension even for `.ts` source files
- `@ts-ignore` is acceptable for untyped third-party API response shapes (Threads GraphQL responses)
- `config/users.json` is gitignored; copy from `config/users.example.json` before running locally
- `generated/token.json` is auto-created at runtime; do not commit it
