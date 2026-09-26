# Plan: CMS for admin + blog

> Implemented on `feat/cms-blog`. Changes from the plan while building:
> - **MinIO image**: the official images are no longer published at all (Docker Hub and quay.io both refuse), so compose uses `chainguard/minio` + `chainguard/minio-client`.
> - **Serving photos**: nginx proxies `/media/` to the API server, which streams from MinIO after checking the key exists in the `media` table. So the bucket needs no public-read policy and MinIO is never exposed.
> - **Rendering**: a ~60-line renderer in `apps/web/src/lib/rich-text.tsx` instead of `@tiptap/static-renderer`, which pulled ~120 kB (gzip) of ProseMirror into every public page. Tiptap now only loads in the admin editor.
> - No width/height on `media` (nothing uses them yet).

## Scope

- Teija edits every public page except the landing page (`/`) in the admin view: Kouluttaja (`/meista`), Yhteystiedot, Ehdot, contact details and the business ID shown site-wide, courses (already editable), and a new **blog**.
- She can also create new plain pages (for example "Leirit") that show up at `/<slug>` and in the footer.
- She uploads her own photos to a media library (stored in MinIO) and picks them for pages, posts and courses.
- The landing page stays hardcoded. It gets one dynamic section: the 3 newest blog posts.
- Teija is not technical. The admin uses a word-processor-style editor, Finnish labels everywhere, and no slugs, markdown or JSON shown by default.
- Finnish only, one admin user, no roles, no revision history.

## Data model (`packages/db/src/schema/cms.ts`)

```
media     id (uuid), key (object key in MinIO), mime, width, height, alt, createdAt
page      id, slug (unique), title, description (SEO), intro, body (jsonb, Tiptap doc),
          heroImageId → media, galleryIds (uuid[] of media), inFooter, published, updatedAt
post      id, slug (unique), title, excerpt, body (jsonb, Tiptap doc), coverImageId → media,
          status (draft | published), publishedAt, createdAt, updatedAt
dog       id, name, age, titles, note, imageId → media, sort
setting   id = 1 (single row), data jsonb: phone, email, businessId, facebook,
          footerText, defaultDescription
```

- `course.image` (a filename in `public/images`) becomes `course.imageId → media`. The migration/seed uploads the 16 photos to MinIO, inserts `media` rows and maps the existing courses.
- Media referenced by a page, post, course or dog can't be deleted (FK restrict; for `galleryIds` and images inside rich text, check in the handler). The error message says where the photo is used, e.g. "Kuva on käytössä kirjoituksessa X".
- System pages `meista`, `yhteystiedot`, `ehdot` can't be deleted and their slug can't change (a constant list in `packages/api`). Every other slug is checked against reserved route names: `kurssit`, `blogi`, `admin`, `media`, the system pages.

## Storage: MinIO

- New `minio` service in `docker-compose.yml` with a named volume. A one-shot `minio/mc` init service creates the `media` bucket and sets anonymous **read-only** download on it. Writing still needs the credentials.
- Server talks to it with Bun's built-in `S3Client` (`import { S3Client } from "bun"`). No SDK dependency.
- Env (`apps/server/.env.schema`): `S3_ENDPOINT` (`http://minio:9000` in Docker, `http://localhost:9000` in dev), `S3_BUCKET=media`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. `bun run db:start` also starts `minio` in dev.
- Public URLs are same-origin: nginx proxies `/media/` to `minio:9000/media/` with `Cache-Control: public, max-age=31536000, immutable` (object keys are uuids and never change). No CORS setup, no presigned read URLs, and no MinIO port exposed publicly.
- Backups: next to the daily `pg_dump`, `mc mirror` the bucket to the same backup location.
- Note: MinIO stopped publishing community Docker images and binaries in late 2025. Pin the last image tag, or use an S3-compatible replacement (Garage, SeaweedFS). The code only uses the S3 API, so a swap is just config.

## Upload flow

1. The browser resizes to ≤1600 px on the long edge and re-encodes as WebP (`<canvas>` + `toBlob`, no library). Phone photos are often 5–10 MB, so this keeps uploads fast and needs no server-side image library.
2. `POST /api/media` (multipart) on Elysia. The server checks the admin session (`auth.api.getSession`), max 5 MB, and that the magic bytes are JPEG, PNG or WebP (the client's `mime` isn't trusted; no SVG).
3. The server writes `<uuid>.webp` to MinIO with its `Content-Type`, then inserts the `media` row. If the insert fails, it deletes the object.
4. Delete: remove the DB row first (FK check), then the object. An orphaned object costs nothing, a missing object shows a broken image.

- Alt text: asked in the upload dialog as "Kuvaile kuva lyhyesti (näkövammaisille ja hakukoneille)" and editable later. Required, but prefilled from the file name so it never blocks the upload.
- Admin UI: a grid of thumbnails, upload (drag-and-drop + "Valitse kuvat" button, several at once, with progress), edit alt text, delete. One `MediaPicker` dialog is reused by the course, page, post and dog forms and by the editor's "Lisää kuva" button.

## Content editor: Tiptap

A word-processor-style editor, no markdown.

- `@tiptap/react` + `@tiptap/pm` + `@tiptap/starter-kit` (v3, includes Link) + `@tiptap/extension-image`.
- Toolbar with **text labels** and icons, in Finnish: Otsikko, Väliotsikko, **Lihavointi**, *Kursiivi*, Luettelo, Numeroitu luettelo, Linkki, Lisää kuva (opens `MediaPicker`), Kumoa/Tee uudelleen. No heading levels beyond H2/H3, no colours, no fonts. That keeps the site consistent however she formats.
- Pasting from Word, Facebook or email: Tiptap reduces pasted content to the allowed nodes, so stray fonts and colours are dropped.
- Store the Tiptap JSON (`jsonb`), not HTML.
- Public rendering: `@tiptap/static-renderer` (`renderToReactElement`) with the same extension list. Only known nodes are rendered, so no HTML sanitizer is needed. The editor and the site render the same way; the editor area uses the same `prose` class as the public page, so what she sees is what gets published.
- Trust boundary: on save, the server walks the doc and rejects link `href`s that aren't `http:`, `https:`, `mailto:` or `tel:` (blocks `javascript:`), and image `src`s that aren't `/media/<uuid>.webp`. The zod schema also caps the doc size. This is the one piece of logic that gets its own test.
- Styling: move the existing `[&_h2]…` classes from `ehdot.tsx` into one `prose` class in `index.css`, used by pages, posts and the editor.
- Shared editor config lives in `apps/web/src/lib/rich-text.ts` (extension list + `RichText` render component) so the editor and the renderer can't drift apart.

## API (`packages/api/src/routers/`)

| Router | Public | Admin (`protectedProcedure`) |
|---|---|---|
| `pages` | `get({slug})` (published only), `footerList` | `list`, `get`, `create`, `update`, `remove` |
| `posts` | `list({limit?})`, `get({slug})` (published and `publishedAt <= now`) | `list`, `get`, `create`, `update`, `remove` |
| `dogs` | `list` | `create`, `update`, `remove`, `reorder` |
| `media` | — | `list`, `updateAlt`, `remove` (upload is a plain Elysia route, serving goes through nginx) |
| `settings` | `get` | `update` |
| `courses` | unchanged | `image` → `imageId` |

- zod input schemas go in `schemas.ts` next to the existing ones, shared with the forms. Error messages in plain Finnish ("Otsikko puuttuu", not "String must contain at least 1 character").
- Publishing a post sets `publishedAt = now()` if it's empty. Setting a future date schedules the post, because `get`/`list` filter on it.
- Slugs are generated from the title on first save (lowercase, ä→a, ö→o, å→a, spaces→`-`, a `-2` suffix on collision) and **don't change** when the title changes later, so shared links keep working. Editable only under "Lisäasetukset". Move `uniqueSlugError`/`pgCode` from `courses.ts` to a shared file.
- The SEO description defaults to the excerpt/intro, so she doesn't have to know what SEO is. Overridable under "Lisäasetukset".

## Public site

| Route | Change |
|---|---|
| `/meista` | Title, intro, hero, body and gallery from `page`; the dog cards from `dog`. |
| `/yhteystiedot` | Intro and photo from `page`; phone, email and Facebook from `setting`. |
| `/ehdot` | Fully from `page`. "Päivitetty" date = `updatedAt`. |
| `/$slug` (new) | Any other published page. 404 if missing. |
| `/blogi` (new) | Post cards: cover, title, date, excerpt. No pagination until there are about 30 posts. |
| `/blogi/$slug` (new) | Post with cover, date, body, and a "Varaa kurssi" CTA at the end. |
| `/` | New "Blogista" section with the 3 newest posts (hidden if there are none). Everything else stays as it is. |
| Header | Add "Blogi". The nav stays hardcoded. |
| Footer | Contact info and business ID from `setting`; custom pages with `inFooter` listed under "Sivusto". |

- `settings.get` loads once in the `_site` layout loader. `lib/site.ts` `contact` and the `MOCK` markers go away.
- The JSON-LD moves from `index.html` into the root head, built from `setting`. Posts add `BlogPosting` JSON-LD.
- `head` for pages and posts: title and description from the loader data. Posts also get `og:image` = the cover.
- Seed (runs only when the tables are empty, like `seedCourses`): the current hardcoded texts of Meistä, Yhteystiedot and Ehdot converted to Tiptap JSON, the three dogs, the gallery, the current `contact` values into `setting`, and one example post marked "(Esimerkki)". Nothing currently on the site is lost.
- The layout loses some detail: the 3-column achievements block on Meistä becomes rich-text sections (H2 + list). If the columns matter, render that page's H2 sections as a grid (CSS only).

## Facebook sharing and SEO

The site is a client-rendered SPA. Google runs the JS, but Facebook's and WhatsApp's link previews don't, and Teija will share posts on Facebook.

- nginx: for `/blogi/*` and custom pages, if the user agent matches `facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot`, `proxy_pass` to the server's `GET /share/*`. That returns a tiny HTML page with `og:title`, `og:description`, `og:image` (absolute URL to `/media/...`), `og:url` and a link to the real URL. Everyone else gets the SPA as today.
- `GET /sitemap.xml` on the server: static routes + published pages + posts. `robots.txt` points to it.
- Skipped: RSS. Add it if anyone asks.

## Admin view

Tabs: **Pyynnöt · Kurssit · Blogi · Sivut · Koirat · Kuvat · Asetukset**.

- **Blogi**: a list (title, "Luonnos"/"Julkaistu"/"Ajastettu", date) + a big "Kirjoita uusi" button. The editor has title, short summary ("Lyhyt kuvaus, näkyy blogilistassa"), cover image (picker), the rich-text body, and buttons **Tallenna luonnos** / **Julkaise** / **Piilota**. Publish date and slug sit under a collapsed "Lisäasetukset". "Esikatsele" opens the post in the real page layout.
- **Sivut**: the list, and the same editor as posts, plus a gallery picker and the "Näytä alatunnisteessa" toggle. System pages show a lock instead of a delete button.
- **Koirat**: cards with edit, and "Siirrä ylös/alas" buttons for order (no drag-and-drop library).
- **Kuvat**: the media library above.
- **Asetukset**: one form for the contact info, business ID, Facebook URL, footer text and default SEO description.
- **Kurssit**: the image radio list becomes the `MediaPicker`. Price is entered in euros, not cents (the form converts).
- Unsaved changes: TanStack Router `useBlocker` + `beforeunload` on all the editors ("Sinulla on tallentamattomia muutoksia"), so a half-written post isn't lost when she clicks another tab.
- Every save shows a toast ("Tallennettu"); every delete asks for confirmation and says what will happen.
- UI: existing `packages/ui` + shadcn `dialog`, `select`, `table`, `tabs`, `switch` (CLI).

## Implementation order

1. **MinIO + schema**: the compose services + bucket init, env, the `cms.ts` schema, migration, and the seed that uploads the existing photos and maps `course.image` → `imageId`. `check-types` passes.
2. **Media**: `POST /api/media`, the nginx `/media/` proxy (plus a Vite dev proxy to MinIO), the `media` router, the Kuvat tab, `MediaPicker`; switch the course form to it.
3. **Settings**: router, Asetukset form, footer/Yhteystiedot/JSON-LD reading from it; delete `contact` from `lib/site.ts`.
4. **Rich text**: `lib/rich-text.ts`, editor + toolbar, `prose` class, the server doc validator + its test.
5. **Pages**: router, editor page, the Meistä/Yhteystiedot/Ehdot routes reading from the DB, `/$slug`, footer links, dogs.
6. **Blog**: router, admin list + editor, `/blogi`, `/blogi/$slug`, header link, landing page section.
7. **Sharing + SEO**: `/share/*`, the nginx bot rule, `sitemap.xml`, post meta/JSON-LD.
8. **Docs**: update README (MinIO in dev, backups, "Placeholder content" becomes "edit in admin"), and walk Teija through the admin once.

Checks to leave behind (in `packages/api`, same style as `requests.test.ts`):
- rich-text validator: rejects a `javascript:` link and a foreign image `src`; accepts a normal doc.
- posts: a draft or future-dated post isn't returned by public `get`/`list`, a published one is; a duplicate title gets a `-2` slug; anonymous callers can't use admin procedures.
- pages: a system page can't be deleted; a reserved slug is rejected.
- media: upload rejects a non-image (bad magic bytes), a file over 5 MB, and anonymous callers; deleting a photo that's in use gives `CONFLICT`. Needs MinIO running, like the other tests need Postgres.

## Open decisions (defaults above)

- **Landing page**: stays hardcoded except for the blog section. If she wants the hero text editable, it's one more `page` row.
- **Email templates** (confirm/decline texts) stay in code. The free-text note already covers per-request wording. Move them to `setting` if she wants to change the default wording.
- **MinIO image**: pin the last community tag vs. switch to Garage now. Default: pin MinIO, since that's what you asked for.
