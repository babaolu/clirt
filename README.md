# Clirt

A customizable T-shirt shop. Customers pick a shirt style (sleeve × neck), a colour, and add their own text or a graphic, then order for delivery in Nigeria. Prices are in Naira and stored as integer kobo.

**Phase 1 (this commit):** project foundation, database schema, Google sign-in, seed data, and placeholder pages. The customizer, cart and checkout come in later phases.

## Stack

- SvelteKit 3 + TypeScript + Svelte 5 runes, Tailwind CSS v4, `@sveltejs/adapter-vercel`
- Neon Postgres via Drizzle ORM (`drizzle-orm/neon-http` + `@neondatabase/serverless`), drizzle-kit migrations
- Better Auth (Drizzle adapter, `pg`) with Google as the only sign-in method
- zod for validation
- Mailgun for order emails (later phase; env vars reserved)

## Environment variables

Copy `.env.example` to `.env` and fill in values. They are declared and validated in `src/env.ts`.

| Variable                                                                       | Required    | Notes                                                                       |
| ------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                 | yes         | Neon connection string (pooled)                                             |
| `BETTER_AUTH_SECRET`                                                           | yes         | `openssl rand -base64 32`                                                   |
| `BETTER_AUTH_URL`                                                              | recommended | Public base URL, e.g. `http://localhost:5173` or `https://<app>.vercel.app` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                                    | for sign-in | Without them the app runs and `/signin` says sign-in isn't configured       |
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_REGION` (`us`/`eu`), `MAIL_FROM` | later phase | Unused for now                                                              |

## Local setup

```sh
npm install
cp .env.example .env        # then fill it in
npm run db:migrate          # apply migrations in ./drizzle
npm run db:seed             # 6 shirt styles + 9 design presets (safe to re-run)
npm run dev                 # http://localhost:5173
```

Other scripts:

- `npm run db:generate`: create a new migration after editing `src/lib/server/db/schema.ts`
- `npm run db:studio`: browse the database with Drizzle Studio
- `npm run auth:schema`: regenerate Better Auth's tables into `src/lib/server/db/auth.schema.ts` (then `db:generate`)
- `npm run check`: type-check

## Google OAuth setup

In Google Cloud Console → APIs & Services → Credentials, create an **OAuth client ID** (type: Web application) and register:

- **Authorized JavaScript origins:** `<BETTER_AUTH_URL>`
- **Authorized redirect URIs:** `<BETTER_AUTH_URL>/api/auth/callback/google`

For example:

```
http://localhost:5173/api/auth/callback/google
https://<your-app>.vercel.app/api/auth/callback/google
```

## Project layout

- `src/lib/customization.ts`: shared customization contract (sizes, shirt colours, fonts, preset slugs, `customizationSchema`)
- `src/lib/money.ts`: `formatNaira(kobo)`, the only money formatter
- `src/lib/server/pricing.ts`: `unitPrice(style, customization)`, the only place prices are computed
- `src/lib/server/auth.ts` / `src/hooks.server.ts`: Better Auth setup and request handler
- `src/lib/server/auth-guard.ts`: `requireUser(event)` redirects to `/signin?redirectTo=…`
- `src/lib/server/db/`: Drizzle schema, generated auth schema, client, seed
