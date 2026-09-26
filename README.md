# koirankoulutus Nyt ja Tässä

Website for Teija Tarkkanen's dog training (Riihimäki): public pages in Finnish, live online courses, a course request form, a blog, and an admin view (CMS) where Teija handles requests and edits everything except the landing page.

Stack: Vite + React + TanStack Router (`apps/web`), Elysia + tRPC (`apps/server`), Postgres + Drizzle (`packages/db`), Better-Auth (`packages/auth`), shared UI in `packages/ui`. Uploaded photos go to MinIO (S3) and are served by the server at `/media/…`.

## Run locally

```bash
bun install
bun run db:start          # Postgres + MinIO in Docker
bun run dev               # web http://localhost:3001, API http://localhost:3000
```

The server runs migrations, creates the admin user and, on an empty database, seeds example courses, the current page texts, dogs, contact details and one example blog post. It also uploads the bundled photos (`apps/web/public/images`) to the media library.

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
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | photo storage; dev defaults match the MinIO in `docker-compose.yml` |

`apps/web/.env`: `VITE_SERVER_URL`.

## Tests and checks

```bash
cd packages/api && bun test   # request + CMS tests, need the dev database running
bun run check-types
bun run check                 # Biome
```

## Deploy

`bun run docker:up` builds and starts web (port 3001), server (3000), Postgres and MinIO. In production, put Caddy/nginx in front for HTTPS, set real env values (`MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` and `POSTGRES_PASSWORD` go in a `.env` next to `docker-compose.yml`; add `MINIO_PORT=9010` there if port 9000 is taken), and back up daily:

- Postgres: `pg_dump`
- Photos: `mc mirror` the `media` bucket (or copy the `koirankoulutus_minio_data` volume)

MinIO no longer publishes official Docker images; compose uses Chainguard's build (`chainguard/minio`). The server only speaks the S3 API, so another S3-compatible store works by changing the `S3_*` variables.

Facebook/WhatsApp link previews don't run JavaScript. nginx (`apps/web/nginx.conf`) sends those crawlers to the server's `/share/…`, which returns just the Open Graph tags for pages and blog posts.

## Content

Teija edits content in the admin view (`/admin`):

| Tab | What |
|---|---|
| Kurssit | courses |
| Blogi | blog posts: draft, publish, schedule (publish date in the future) |
| Sivut | Kouluttaja, Yhteystiedot, Kurssiehdot, plus any new pages (at `/<osoite>`, linked in the footer) |
| Koirat | dog cards on the Kouluttaja page |
| Kuvat | photo library |
| Asetukset | phone, email, Facebook, business ID, footer text, default search description |

The landing page (`apps/web/src/routes/_site/index.tsx`) stays in code; its "Blogista" section shows the 3 newest posts.

Placeholder content still to replace (all editable in admin): the contact details and business ID in Asetukset, the terms and privacy notice in Sivut → Kurssiehdot, and the example courses and blog post (named "(Esimerkki)").
