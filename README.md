# Clirt

Clirt is a custom T-shirt shop for Nigeria. Customers pick a cut and colour, add their own text or a graphic, drag it into place on a live preview, and order for delivery. They pay on delivery; nothing is charged online.

**Live:** https://clirt-delta.vercel.app

## Features

- **Six styles**: short or long sleeve × round, V or collar neck, each with its own base price.
- **Customizer** with a live SVG preview:
  - 8 shirt colours, sizes S–XXL, quantity 1–20
  - text (up to 40 characters, 6 fonts, 4 effects: plain, arched, outlined, stacked) or one of 5 original graphics
  - drag the design on the preview (mouse or touch), or nudge it with the arrow keys; size and position sliders stay in sync
  - your design is saved as a draft in the browser and restored after sign-in
- **Cart**: previews, quantity updates, removal, subtotal.
- **Checkout**: contact and delivery details for the 36 states plus FCT, validated on the server. Pay on delivery.
- **Order confirmation email** through Mailgun, with a resend button if sending failed.
- **Order history and order detail** pages, showing the preview stored when the order was placed.
- **Google sign-in** (the only sign-in method).
- **Privacy policy** at `/privacy`. Fonts are self-hosted, and there's no tracking or advertising.

## Stack

- SvelteKit 3, Svelte 5 (runes), TypeScript, Tailwind CSS v4
- Vercel (`@sveltejs/adapter-vercel`), with functions pinned to `lhr1` (London), next to the database
- Neon Postgres (eu-west-2, London) through Drizzle ORM and the Neon serverless HTTP driver; drizzle-kit migrations
- Better Auth with the Drizzle adapter, Google as the only provider
- zod for validation
- Mailgun HTTP API through `fetch`, with no SDK
- Fonts self-hosted with `@fontsource`

## Architecture notes

- **Money is integer kobo everywhere.** `formatNaira` in `src/lib/money.ts` is the only formatter.
- **One price function.** `unitPrice(style, customization)` in `src/lib/server/pricing.ts` is the only place a price is computed: base price plus the text or graphic surcharge. The cart, checkout and order snapshots all call it. Prices shown in the customizer are display-only, and the server never trusts a price from the client.
- **One renderer for previews and orders.** `renderShirtSvg` in `src/lib/render/shirt.ts` is a pure function with no DOM access:
  - it powers the live preview in the browser and renders each order item's `preview_svg` on the server when the order is placed
  - all user text is XML-escaped, colours are checked against `#rrggbb`, and every SVG id is prefixed so several previews can share a page
  - the dashed printable-area outline is opt-in (`showPrintArea`) and only the customizer turns it on
- **Shared customization contract.** `src/lib/customization.ts` holds the sizes, colours, fonts and preset slugs, plus the zod `customizationSchema`. Client and server both import it. On add-to-cart and again at checkout, the server checks that the chosen preset exists, is active and is the right kind.
- **Atomic order placement.** The neon-http driver has no interactive transactions, so checkout does the following:
  1. re-reads the user's cart, re-validates every item and re-prices it with `unitPrice`
  2. renders the previews on the server
  3. inserts the order and its items and deletes exactly the cart rows it read, all in one `db.batch([...])`, which Neon runs as a single transaction
- **Email never blocks an order.** The confirmation is sent after the order is saved. The result is recorded on the order (`email_status`, `email_message_id`, `email_error`), and the order page offers **Resend confirmation email** when it wasn't sent. The templates in `src/lib/server/email-template.ts` are pure, table-based and HTML-escaped.
- **Auth.** Better Auth runs in `hooks.server.ts` and puts the session user on `locals`. `requireUser(event)` redirects signed-out visitors to `/signin?redirectTo=…`, and only same-site relative paths are accepted as `redirectTo`.

## Environment variables

Copy `.env.example` to `.env`. The variables are declared and validated in `src/env.ts`.

| Variable                                   | Required          | Notes                                                                             |
| ------------------------------------------ | ----------------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | yes               | Neon connection string (pooled)                                                   |
| `BETTER_AUTH_SECRET`                       | yes               | `openssl rand -base64 32`                                                         |
| `BETTER_AUTH_URL`                          | yes in production | Public base URL, e.g. `http://localhost:5173` or `https://clirt-delta.vercel.app` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for sign-in       | Without them the app still runs and `/signin` says sign-in isn't configured       |
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`        | for email         | Without them orders still work and email is marked failed                         |
| `MAILGUN_REGION`                           | no                | `us` (default) or `eu`                                                            |
| `MAIL_FROM`                                | for email         | e.g. `Clirt <postmaster@your-sandbox-domain.mailgun.org>`                         |

## Local setup

```sh
npm install
cp .env.example .env          # then fill it in
npm run db:migrate            # apply the migrations in ./drizzle
npm run db:seed               # 6 shirt styles + 9 design presets (safe to re-run)
npm run dev -- --port 5173    # http://localhost:5173 (must match BETTER_AUTH_URL)
```

Other scripts:

- `npm run check`: type-check.
- `npm run build`: production build.
- `npm run db:generate`: create a migration after editing `src/lib/server/db/schema.ts`.
- `npm run db:studio`: browse the database.
- `npm run auth:schema`: regenerate Better Auth's tables into `src/lib/server/db/auth.schema.ts`, then run `db:generate`.

### Troubleshooting: `fetch failed` / `ETIMEDOUT` to Neon locally

On a high-latency connection (for example, Nigeria to London), Node's default 250 ms per-address connect timeout can make database requests fail at random. Give it longer:

```sh
NODE_OPTIONS="--network-family-autoselection-attempt-timeout=2000" npm run dev -- --port 5173
```

The same applies to `db:migrate` and `db:seed`. Production isn't affected, because functions run in London next to the database.

## Google OAuth setup

In Google Cloud Console, go to **APIs & Services → Credentials** and create an OAuth client ID of type **Web application**:

|            | Authorized JavaScript origins    | Authorized redirect URIs                                  |
| ---------- | -------------------------------- | --------------------------------------------------------- |
| Local      | `http://localhost:5173`          | `http://localhost:5173/api/auth/callback/google`          |
| Production | `https://clirt-delta.vercel.app` | `https://clirt-delta.vercel.app/api/auth/callback/google` |

The callback path is always `<BETTER_AUTH_URL>/api/auth/callback/google`.

To publish the OAuth consent screen beyond test users, Google requires:

- an app home page URL: `https://clirt-delta.vercel.app`
- a privacy policy URL: `https://clirt-delta.vercel.app/privacy`

## Mailgun

Set `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_REGION` and `MAIL_FROM`. On a **sandbox domain**, Mailgun only delivers to _authorized recipients_ that you've added in the Mailgun dashboard. Sending to anyone else fails, the order shows "Email failed", and you can resend once the recipient is authorized or a verified domain is set up.

## Deployment

Pushes to `main` deploy to production on Vercel. The production environment needs every variable above, with `BETTER_AUTH_URL=https://clirt-delta.vercel.app`. Functions run in `lhr1`; you can check this with the `x-vercel-id` response header, which contains `lhr1::`.

## Known limits

- **Email:** on a Mailgun sandbox domain, only authorized recipients receive confirmations.
- **Payment:** there is no online payment. Every order is pay on delivery, and order status is not managed in the app (orders stay "Pending").
- **Double orders:** double-submit protection is client-side only (the button is disabled while the order is placed). Two simultaneous submissions could create two orders.
- **Long text:** squeezed to fit using an estimate of its width, not a measurement, so very long text may not fill the area exactly.
- **Drafts:** one draft per browser (`localStorage`), not one per style.
