# Nova Web

Production: https://nova-launcher-web-ten.vercel.app

A responsive browser companion for Nova Launcher. Sign in with the same Nova account. Personal data is read from the existing Supabase `nova_profiles` table under owner-scoped RLS.

## Included

- Cloud library with search, store filters, favorites, last-played / playtime / acquisition ordering.
- Game details, screenshots, per-source playtime and synchronized achievements.
- Explore recommendations based on cloud playtime, store search, Epic free games, wishlist deals and upcoming games.
- Nova wishlist add/remove with atomic Postgres RPC updates, plus public Steam wishlist import.
- Automatic discovery refresh on entering Explore (15-minute cache), automatic Steam wishlist refresh on entering Wishlist (5-minute cache), and automatic metadata hydration for missing wishlist games.
- Cloud snapshot refresh and requests to update connected libraries on Nova PC. Requests remain queued while the PC is offline. Requires Nova Launcher 0.1.1 or later.

Store login sessions are never uploaded to Supabase. Browser sign-in uses Supabase Auth and keeps the Nova browser session on the current browser; store credentials remain on the desktop. The cloud contains library metadata, wishlist, preferences, friend identity mappings and achievement progress. Supabase Auth separately manages the Nova account identity and protected sign-in credentials.

## Build and deployment

Run `npm ci` then `npm run build` from this directory. Deploy `public/` as a static Vercel project. `public/vercel.json` includes CSP and security headers. The production alias is public; Vercel Standard Protection keeps previews and generated deployment URLs private.

`supabase/schema.sql` is the initial schema for the added catalog, update queue and wishlist RPC. `supabase/wishlist-import.sql` adds the Steam import RPC. The `nova_profiles` owner RLS policies must already exist. Deploy `supabase/nova-web-api.ts` as `nova-web-api` with JWT verification enabled. It validates the signed-in user before contacting the stores and caches public metadata in `nova_catalog`. The service key stays in Supabase's function environment and is never bundled into the website.

The browser bundle contains only the publishable Supabase key. Fork maintainers must use their own backend configuration.

## Tests

`npm test` checks the browser model. Run `node ui.test.mjs` with the root development dependencies installed for synthetic signed-in UI tests, including automatic page refresh. Database isolation, cross-user writes and wishlist add/remove are also tested transactionally against the deployed database with rolled-back fixtures. Anonymous API requests are rejected.

## Artwork and mobile library

SteamGridDB is optional. Public Steam covers are retrieved without an API key. A
SteamGridDB key enables searching its alternative artwork; titles without Steam
art or a catalog match may still have no cover. Selected HTTPS artwork URLs sync
with the Nova profile and are displayed on the web without supplying the key.
Local files selected by older Nova builds have no recoverable source URL: select
that artwork again in the updated desktop client to sync it across devices.

Before distributing the updated desktop client, apply
`supabase/artwork-credentials.sql` in the Supabase SQL editor. It creates an
owner-scoped RLS table for the SteamGridDB key, separate from library snapshots
and the public catalog. The authenticated owner's clients can retrieve the key;
this is not end-to-end encryption. Local credentials remain protected with
Windows safeStorage. No store sessions are uploaded. Desktop profile startup and
library/profile sync retrieve the key; connecting SteamGridDB uploads it and
retries missing artwork. A failed credential upload is reported instead of
claiming cloud sync succeeded.

Run `npm test` at the root, `npm test` and `npm run build` in `web/`, and
`node web/ui.test.mjs` from the root. Publish the updated `web/public/` directory
to update the website, and distribute a new Windows desktop build for its fixes.
The database migration and deployments are separate from local test validation.
