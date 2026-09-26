# koirankoulutus Nyt ja Tässä

Website for Teija Tarkkanen's dog training (Riihimäki): public pages in Finnish, live online courses, a course request form, and an admin view where Teija confirms or declines requests and manages courses.

Stack: Vite + React + TanStack Router (`apps/web`), Elysia + tRPC (`apps/server`), Postgres + Drizzle (`packages/db`), Better-Auth (`packages/auth`), shared UI in `packages/ui`.

## Run locally

```bash
bun install
bun run db:start          # Postgres in Docker
bun run dev               # web http://localhost:3001, API http://localhost:3000
```

The server runs migrations, creates the admin user and seeds example courses on start.

- Admin: http://localhost:3001/admin, log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `apps/server/.env` (dev default `teija@example.com` / `koira12345`).
- Emails: without `RESEND_API_KEY` they are printed to the server console.

## Environment (`apps/server/.env`)

| Variable | |
|---|---|
| `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN` | as usual |
| `PUBLIC_SITE_URL` | site URL used in email links |
| `RESEND_API_KEY` | optional; emails go to the console when empty |
| `MAIL_FROM` | sender, must be on a domain verified in Resend |
| `TRAINER_EMAIL` | where new requests are notified |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | admin account created at server start if missing |

`apps/web/.env`: `VITE_SERVER_URL`.

## Tests and checks

```bash
cd packages/api && bun test   # request handler tests, need the dev database running
bun run check-types
bun run check                 # Biome
```

## Deploy

`bun run docker:up` builds and starts web (port 3001), server (3000) and Postgres. In production, put Caddy/nginx in front for HTTPS, set real env values, and back up Postgres (`pg_dump`) daily.

## Placeholder content to replace

- `apps/web/src/lib/site.ts`: phone, email, business ID (marked `MOCK`)
- `apps/web/index.html`: JSON-LD phone and email
- `apps/web/src/routes/_site/ehdot.tsx`: terms and privacy notice, review before launch
- Example courses (named "(Esimerkki)"): edit or delete them in the admin view
- Photos: `apps/web/public/images` (resized copies of `assets/images`)
