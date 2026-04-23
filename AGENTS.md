# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack
- Node.js + TypeScript, Express 5, run via `tsx` (no compile step needed)
- Package manager: **pnpm** (use `pnpm` not `npm`)
- No test suite exists

## Commands
```bash
pnpm start          # run once with tsx
pnpm dev            # run with --watch (hot reload)
pnpm docker         # build & push Docker image via build.sh
```

## Architecture
Request flow: `src/index.ts` → `src/controllers/index.ts` → `posts.ts` / `users.ts` / `meta.ts` → `src/utils/fetch/findPost.ts` or `findUser.ts` → `src/utils/renderSeo.ts` (returns HTML with OG/Twitter meta tags)

- Controllers redirect to `threads.com` on error/not-found (never return 4xx for missing content)
- `HttpError` from `src/utils/utils.ts` is the only way to propagate HTTP errors to the global error handler in `src/index.ts`
- All global interfaces (`ContentProps`, `DataProps`, `VideoProps`, etc.) are declared in `src/types/application.d.ts` as ambient globals — no import needed

## Critical Patterns

### Auth / Token management
- `config/users.json` (gitignored, copy from `config/users.example.json`) holds Instagram credentials
- Token is cached in-memory and persisted to `generated/token.json` (auto-created)
- `login()` / `refreshToken()` in `src/utils/fetch/igLogin.ts` handle fallback auth when Threads API returns "Not Logged In" or rate-limit errors
- `runningLogin` flag prevents concurrent login attempts — do not bypass it

### Video proxy
- `PROXIES` env var is a comma-separated list of proxy hostnames used to serve Instagram video URLs
- `ENVIRONMENT=production` switches the oEmbed base URL from `local.milanm.cc` to `fixthreads.net`

### Rate limiting
- `src/utils/ratelimit.ts` wraps `express-rate-limit` and uses `req.cf_ip` (Cloudflare real IP) before falling back to `req.ip`
- Trust proxy is set to a specific subnet (`192.168.86.0/24`) in `src/index.ts` — update if deploying elsewhere

### Threads post ID encoding
- Post codes (e.g. `CuXX...`) are base64-decoded to numeric IDs using a custom alphabet in `findPost.ts` — do not use `atob`

## TypeScript Config
- Extends `gts/tsconfig-google` (Google TypeScript Style)
- `noUnusedLocals`, `noUnusedParameters`, `noImplicitAny`, `strictNullChecks` all enabled
- Module system: `NodeNext` — use `.js` extensions in relative imports if adding new files
- `@ts-ignore` is used in a few places for untyped third-party API responses; acceptable pattern
