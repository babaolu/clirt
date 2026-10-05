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
- **Google sign-in** (the only sign-in method), on the web and in the Android app. One Google account is one Clirt account everywhere.
- **Instant cart sync** across tabs and devices through Pusher Channels.
- **JSON API** at `/api/v1` for the Android app (see [API](#api)).
- **Self-service account deletion** at `/account`, or `DELETE /api/v1/me`.
- **Privacy policy** at `/privacy`. Fonts are self-hosted, and there's no tracking or advertising.

## Stack

- SvelteKit 3, Svelte 5 (runes), TypeScript, Tailwind CSS v4
- Vercel (`@sveltejs/adapter-vercel`), with functions pinned to `lhr1` (London), next to the database
- Neon Postgres (eu-west-2, London) through Drizzle ORM and the Neon serverless HTTP driver; drizzle-kit migrations
- Better Auth with the Drizzle adapter, Google as the only provider, and the `@better-auth/expo` server plugin for the mobile app
- Pusher Channels (`pusher` on the server, `pusher-js` in the browser) for live cart updates
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
- **Shared services.** Cart, catalog, checkout, orders and account logic live in `src/lib/server/services/` as plain functions that take `(userId, input)`. The web form actions and the `/api/v1` endpoints both call them, so validation, preset checks and pricing exist once. A `ServiceError` (status, code, message, optional field errors) becomes `fail()` for forms and the JSON error envelope for the API.
- **Live cart sync.** After every successful cart change (add, quantity change, remove, or the cart being emptied by an order), from a form or the API, the cart service publishes `cart-updated` with `{ itemCount, at }` on `private-user-<userId>`. Publishing has a 1.5 s timeout and never fails the cart change. Signed-in browsers subscribe in the root layout: the header count updates from the event, and `/cart` and `/checkout` reload their data (`invalidate('app:cart')`). Pages also refresh when the window regains focus or becomes visible. Without `PUSHER_*`, everything still works, just without live updates.
- **Account deletion.** Every foreign key to `user` cascades (sessions, linked Google account, cart items, orders and through them order items), so deleting the user row removes everything. A later Google sign-in creates a brand-new account.
- **Auth.** Better Auth runs in `hooks.server.ts` and puts the session user on `locals`. `requireUser(event)` redirects signed-out visitors to `/signin?redirectTo=…`, and only same-site relative paths are accepted as `redirectTo`.

## Environment variables

Copy `.env.example` to `.env`. The variables are declared and validated in `src/env.ts`.

| Variable                                   | Required          | Notes                                                                                  |
| ------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | yes               | Neon connection string (pooled)                                                        |
| `BETTER_AUTH_SECRET`                       | yes               | `openssl rand -base64 32`                                                              |
| `BETTER_AUTH_URL`                          | yes in production | Public base URL, e.g. `http://localhost:5173` or `https://clirt-delta.vercel.app`      |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for sign-in       | Without them the app still runs and `/signin` says sign-in isn't configured            |
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`        | for email         | Without them orders still work and email is marked failed                              |
| `MAILGUN_REGION`                           | no                | `us` (default) or `eu`                                                                 |
| `MAIL_FROM`                                | for email         | e.g. `Clirt <postmaster@your-sandbox-domain.mailgun.org>`                              |
| `PUSHER_APP_ID`, `PUSHER_SECRET`           | for live sync     | Server only                                                                            |
| `PUSHER_KEY`, `PUSHER_CLUSTER`             | for live sync     | Public: sent to the browser to subscribe                                               |
| `EXPO_DEV_ORIGINS`                         | no                | `true` trusts Expo Go (`exp://…`) origins outside local dev; leave unset in production |

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

## Mobile sign-in (Android app)

The Android app signs in with Better Auth's Expo client and `@better-auth/expo` on the server:

- **No new Google client.** The app opens Google in the system browser using the same OAuth **web** client and the same redirect URI (`<BETTER_AUTH_URL>/api/auth/callback/google`). A native Android OAuth client is only needed for ID-token sign-in, which isn't used.
- **Return to the app.** The server then redirects to the app scheme `clirt://` with the session cookie, which the app keeps in secure storage. Because the same Google account maps to the same Better Auth account row, web and mobile share one Clirt account, cart and order history.
- **Trusted origins:** `clirt://` always. Expo Go origins (`exp://`, `exp://**`, `exp://192.168.*.*:*/**`) are trusted only in local dev, or when `EXPO_DEV_ORIGINS=true`. The Expo plugin attaches the session cookie to redirects into trusted app origins, so keep them off in production.
- **API calls:** the app sends `Cookie: <authClient.getCookie()>` with `credentials: "omit"`.

## API

The JSON API for the mobile app lives at `/api/v1`.

- **Auth:** the Better Auth session (the browser cookie, or the `Cookie` header sent by the Expo client).
- **Money:** integer kobo.
- **Bodies:** requests with a body must send `Content-Type: application/json`.

Errors always look like this:

```json
{
	"error": {
		"code": "validation_failed",
		"message": "Please check the highlighted fields.",
		"fields": { "quantity": "Quantity must be 1–20" }
	}
}
```

| Status | When                                     | `code`                                                                                                                           |
| ------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 400    | Invalid input                            | `validation_failed`, `invalid_json`, `invalid_body`, `style_unavailable`, `preset_unavailable`, `cart_empty`, `cart_unavailable` |
| 401    | Not signed in. Never a redirect.         | `unauthorized`                                                                                                                   |
| 403    | Realtime auth for someone else's channel | `forbidden_channel`                                                                                                              |
| 404    | Not found, or not yours                  | `not_found`                                                                                                                      |
| 409    | Resend when the email was already sent   | `already_sent`                                                                                                                   |
| 502    | Mailgun failed again on resend           | `email_failed`                                                                                                                   |

### `GET /api/v1/catalog` (public)

```json
{
	"styles": [
		{
			"slug": "short-sleeve-round-neck",
			"name": "Short-sleeve Round-neck",
			"sleeve": "short",
			"neck": "round",
			"basePriceKobo": 700000
		}
	],
	"presets": [
		{
			"slug": "arched",
			"name": "Arched",
			"kind": "text_style",
			"config": { "effect": "arc", "fontSize": 0.14, "...": "..." }
		}
	],
	"sizes": ["S", "M", "L", "XL", "XXL"],
	"shirtColors": { "navy": { "name": "Navy", "hex": "#1e2a4a" } },
	"fonts": {
		"bungee": { "name": "Bungee", "family": "'Bungee', sans-serif", "weight": 400, "...": "..." }
	},
	"surcharges": { "text": 100000, "graphic": 150000 }
}
```

### `GET /api/v1/me`

```json
{
	"user": {
		"id": "x8Kd…",
		"name": "Ada Lovelace",
		"email": "ada@example.com",
		"image": "https://…"
	}
}
```

### `DELETE /api/v1/me`

Deletes the account and everything tied to it. The client should then discard its stored cookie.

```json
{ "deleted": true }
```

### `GET /api/v1/cart`

```json
{
	"items": [
		{
			"id": 42,
			"styleSlug": "short-sleeve-v-neck",
			"styleName": "Short-sleeve V-neck",
			"size": "L",
			"quantity": 2,
			"customization": {
				"shirtColor": "navy",
				"design": {
					"kind": "text",
					"text": "Owambe Crew",
					"font": "bungee",
					"textColor": "#f2b230",
					"presetSlug": "stacked"
				},
				"placement": { "x": 0.5, "y": 0.35, "scale": 1 }
			},
			"designSummary": "Text \"Owambe Crew\" · Bungee · Stacked",
			"unitPriceKobo": 850000,
			"lineTotalKobo": 1700000,
			"previewSvg": "<svg …>",
			"problem": null
		}
	],
	"itemCount": 2,
	"subtotalKobo": 1700000
}
```

`problem` is non-null when an item can no longer be ordered, for example because its style was retired. Checkout refuses until the item is removed.

### `POST /api/v1/cart/items` → 201

```json
// request
{ "styleSlug": "short-sleeve-v-neck", "size": "L", "quantity": 2, "customization": { "shirtColor": "navy", "design": { "kind": "graphic", "presetSlug": "lightning", "graphicColor": "#f2b230" }, "placement": { "x": 0.5, "y": 0.35, "scale": 1 } } }
// response
{ "item": { "id": 43, "...": "same shape as a cart item" }, "cart": { "items": [], "itemCount": 2, "subtotalKobo": 1800000 } }
```

### `PATCH /api/v1/cart/items/:id`

```json
// request
{ "quantity": 3 }
// response
{ "item": { "id": 43, "quantity": 3, "...": "..." }, "cart": { "...": "..." } }
```

### `DELETE /api/v1/cart/items/:id`

```json
{ "cart": { "items": [], "itemCount": 0, "subtotalKobo": 0 } }
```

### `POST /api/v1/checkout` → 201

The fields are the same as the web checkout form. `notes` is optional. Pay on delivery.

```json
// request
{ "contactEmail": "ada@example.com", "shippingName": "Ada Lovelace", "phone": "0803 123 4567", "address": "12 Allen Avenue", "city": "Ikeja", "state": "Lagos", "notes": "Call on arrival" }
// response
{ "orderId": "82d87d6c-7509-4428-a1b6-bd2954d8cf8f", "emailStatus": "sent" }
```

### `GET /api/v1/orders`

```json
{
	"orders": [
		{
			"id": "82d87d6c-…",
			"number": "82D87D6C",
			"createdAt": "2026-10-05T10:12:00.000Z",
			"status": "pending",
			"emailStatus": "sent",
			"totalKobo": 1700000,
			"itemCount": 2
		}
	]
}
```

### `GET /api/v1/orders/:id`

```json
{
	"order": {
		"id": "82d87d6c-…",
		"number": "82D87D6C",
		"createdAt": "…",
		"status": "pending",
		"subtotalKobo": 1700000,
		"totalKobo": 1700000,
		"contactEmail": "ada@example.com",
		"shippingName": "Ada Lovelace",
		"phone": "08031234567",
		"address": "12 Allen Avenue",
		"city": "Ikeja",
		"state": "Lagos",
		"notes": null,
		"emailStatus": "failed",
		"emailError": "Mailgun 400: …",
		"items": [
			{
				"id": 7,
				"styleName": "Short-sleeve V-neck",
				"size": "L",
				"quantity": 2,
				"unitPriceKobo": 850000,
				"lineTotalKobo": 1700000,
				"customization": { "…": "…" },
				"colorName": "Navy",
				"designSummary": "Text \"Owambe Crew\" · Bungee · Stacked",
				"previewSvg": "<svg …>"
			}
		]
	}
}
```

`previewSvg` is the snapshot rendered on the server when the order was placed.

### `POST /api/v1/orders/:id/resend-email`

```json
{ "emailStatus": "sent" }
```

### `POST /api/v1/realtime/auth`

Pusher private-channel authorization. It only authorizes `private-user-<your user id>`, and returns 403 for any other channel.

- **Web:** pusher-js sends the default form-encoded body (`socket_id`, `channel_name`).
- **Mobile:** send JSON. SvelteKit rejects cross-site form posts that have no `Origin` header.

```json
// request
{ "socket_id": "123.456", "channel_name": "private-user-x8Kd…" }
// response
{ "auth": "<key>:<signature>" }
```

### Live cart events

Subscribe to `private-user-<userId>` with the public `PUSHER_KEY` and `PUSHER_CLUSTER`, authorizing through `/api/v1/realtime/auth`. After every cart change the channel receives:

```json
// event: "cart-updated"
{ "itemCount": 3, "at": "2026-10-05T10:12:00.123Z" }
```

Refetch `GET /api/v1/cart` when it arrives.

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
- **Live sync:** events are best-effort. If Pusher is down or a device misses an event, the page catches up on the next focus or visibility change, or on the next request.
