# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

The user writes prompts in English. **Always write your responses/feedback to the user in Brazilian Portuguese (pt-BR)**, regardless of the prompt language. Code, identifiers, and commit messages stay in their natural language.

## Project governance (read before changing anything)

[regras-codex-preventivas.md](regras-codex-preventivas.md) is a binding set of preventive rules the maintainer expects to be followed. The essentials:

- **Zero-deletion by default.** Never delete/rename/move files, drop tables, reset migrations, or overwrite legacy code without explicit human approval. If something looks unused, point to it and ask — do not act.
- **No hallucination.** Don't claim a file/route/table/env-var exists without pointing to it; distinguish observed fact from inference from suggestion.
- **Backend must enforce every UI permission.** Never trust the frontend for access control; never relax auth "to make testing easier."
- **Validate before declaring done** (types, imports, routes, DB impact) and report what you actually ran — never claim you tested/built/migrated if you didn't.
- For destructive or wide-reaching changes (schema-breaking, auth-flow, mass route changes), stop and ask first.

## Commands

```bash
npm run dev       # Start unified dev server (Express + Vite middleware) on http://localhost:5000
npm run build     # Production build: Vite client -> dist/public, esbuild server -> dist/index.cjs
npm start         # Run the production build (node dist/index.cjs)
npm run check     # TypeScript typecheck (tsc, no emit)
npm run db:push   # Sync shared/schema.ts to the database via drizzle-kit (no migration files in dev)
```

- **There is no test suite and no ESLint/Prettier config.** Do not invent `npm test`/`npm run lint`. `npm run check` (tsc) is the only static gate.
- **A live PostgreSQL is required to boot** — the server throws if `DATABASE_URL` is unset ([server/db.ts](server/db.ts)) and runs `seedDatabase()` on startup ([server/routes.ts](server/routes.ts), called from `registerRoutes`). You cannot start the app without a reachable DB.
- Required env (`.env`, loaded via `dotenv`): `DATABASE_URL` (required), `SESSION_SECRET`, `APP_URL`, `PORT` (defaults to 5000).
- Seeded logins after first boot: Admin RA `26548998` / `Admin@12345`, Professor `Professor@123`, Aluno `Aluno@12345`.

## Architecture

Type-safe monorepo with three top-level source folders that share types and validation across the stack:

- **`client/`** — React 18 SPA (Vite, Wouter routing, TanStack Query, shadcn/ui "new-york" on Radix, Tailwind, React Hook Form + Zod).
- **`server/`** — Express **v5** run directly with `tsx` (no separate compile step in dev).
- **`shared/`** — Drizzle schema + Zod API contracts imported by **both** sides.

Path aliases (see [vite.config.ts](vite.config.ts) / [tsconfig.json](tsconfig.json)): `@` → `client/src`, `@shared` → `shared`, `@assets` → `attached_assets`.

### Single unified server on port 5000

[server/index.ts](server/index.ts) creates one HTTP server that handles **both** the API and the frontend:
- `/api/*` → Express JSON routes.
- Everything else → in **dev**, Vite middleware with HMR ([server/vite.ts](server/vite.ts)); in **production**, static files from `dist/public` with SPA fallback to `index.html` ([server/static.ts](server/static.ts)).

There is no separate frontend dev server — the React app and API are always same-origin on 5000.

### The shared contract pattern (most important convention)

[shared/routes.ts](shared/routes.ts) exports a single `api` object describing every endpoint: `method`, `path`, Zod `input`, and Zod `responses`. **Both** client and server import it:
- Server registers handlers using `api.X.path` and validates bodies with `api.X.input.parse(req.body)`.
- Client hooks fetch using the same `api.X.path` and parse responses with the same Zod schemas.

When adding or changing an endpoint, edit the contract in `shared/routes.ts` **first**, then update the server handler in [server/routes.ts](server/routes.ts) and the client hook in `client/src/hooks/`. Keeping these three in sync is what prevents client/server drift.

### Data access layer

All database access goes through a single abstraction: the `IStorage` interface (~54 methods) implemented by `DatabaseStorage` and exported as the `storage` singleton in [server/storage.ts](server/storage.ts) (~2000 lines). Route handlers call `storage.*` — they never touch Drizzle/`db` directly. Add new persistence logic as methods on this interface/class.

### Auth

[server/auth.ts](server/auth.ts) uses Passport `LocalStrategy` configured with `usernameField: "identifier"` — login accepts **RA, CPF, or e-mail** plus password (resolved via `storage.getUserByLoginIdentifier`). Sessions are cookie-based via `express-session` (1-day). Passwords hashed with Node `crypto.scrypt`. Login has basic in-memory rate limiting. Roles are `admin` | `teacher` | `student`.

### Design system

[DESIGN.md](DESIGN.md) documents the existing UI system (color tokens, fonts DM Sans/Outfit, page scaffold, shadcn/ui usage, loading/empty states, the print-to-PDF engine, and the shared schedule-grid constants). **Consult it before any UI change** and follow the existing patterns rather than introducing new tokens/components.

### Client data fetching

[client/src/lib/queryClient.ts](client/src/lib/queryClient.ts): TanStack Query defaults are aggressive caching — `staleTime: Infinity`, no refetch on focus/interval, no retry. Query keys are URL path segments joined with `/`. Use `apiRequest(method, url, data)` for mutations (sends `credentials: "include"`). Pages are lazy-loaded via Wouter in [client/src/App.tsx](client/src/App.tsx); `LayoutShell` renders role-filtered sidebar nav and protected routes redirect unauthenticated users to `/login`.

### File uploads

Course materials upload via `multer` memory storage, then persist to disk under `storage/materials/`; downloads are served through `/api/materials/:id/download`.

## Gotchas

- **[replit.md](replit.md) is stale.** It describes an old 4-table schema and `password123` credentials. The real schema has 25 `pgTable` definitions in [shared/schema.ts](shared/schema.ts) (~34 DB objects incl. junctions) and the seed credentials above. Trust the code, not `replit.md`.
- Server is bundled to **CommonJS** (`dist/index.cjs`) by esbuild; the build script keeps an allowlist of deps bundled and marks the rest `external` ([script/build.ts](script/build.ts)).
- `reusePort` is disabled on Windows in [server/index.ts](server/index.ts) — keep platform guards when touching the listen call.
- The UI and most domain language are Portuguese (Brazilian); match existing naming/comment conventions when editing.
