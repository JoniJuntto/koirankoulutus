# Plan: website for koirankoulutus Nyt ja Tässä

## Scope

- Finnish-only website for Teija "Tytti" Tarkkanen, a dog trainer in Riihimäki.
- She sells **live online courses** (scheduled group sessions over Zoom/Teams).
- Customers send a **course request** through a form. Requests are saved in the database. Teija confirms or declines them in an **admin view**, and sends invoices herself.
- No published time slots, no online payment, no customer accounts.
- Real content: the bio and 14 photos in `assets/`. Mock content (flagged with `// MOCK` / "Esimerkki"): services and prices, courses, business ID (Y-tunnus), cancellation policy, locations, phone and email.

## Architecture

Public static pages + one request form + an admin view. Payments are the only part of the scaffold that goes away.

| Keep | Remove |
|---|---|
| `apps/web` (Vite + TanStack Router + Tailwind + `packages/ui`) | Polar plugin, `packages/auth/src/lib/payments.ts`, `@polar-sh/better-auth`, `POLAR_*` env |
| `apps/server` (Elysia) + tRPC | Public sign-up (`sign-up-form.tsx`, `emailAndPassword.disableSignUp: true`) |
| `packages/db` (Postgres + Drizzle) | Demo `dashboard`/`success` routes |
| `packages/auth` (Better-Auth email + password, admin only) | Theme toggle (light only) |

- Courses live in the database so Teija can edit them in the admin view. The mock courses go in with a seed script.
- A request is **saved to the database first**, then emails go out through Resend. If sending fails, the request is still saved and shows up in the admin view with a "sähköposti epäonnistui" (email failed) flag. The customer still sees a success page.

## Data model (`packages/db/src/schema/courses.ts`)

```
course          id, slug (unique), name, description, targetGroup, startsOn, schedule ("ti klo 18–19"),
                sessions, platform, priceCents, maxParticipants, image, published, createdAt
course_request  id, courseId → course, name, email, phone, dogName, dogBreed, dogAge, message,
                status (new | confirmed | declined), emailFailed, createdAt, handledAt
```

- Confirmed count per course = `count(*) where status = 'confirmed'`, computed in the query with no stored counter. The public page shows "Täynnä" (full) when it reaches `maxParticipants`. The form still accepts requests for a full course as waitlist interest; Teija decides.
- Deleting a course that has requests: not allowed (FK restrict). Unpublish it instead.

## Pages

| Route | Content | Photos |
|---|---|---|
| `/` | Hero ("Koirankoulutusta nyt ja tässä"), short intro to Teija, 3 upcoming online courses, CTA "Varaa kurssi" | 7 (heelwork) as hero, 5 (dumbbell retrieve) |
| `/kurssit` | All online courses: topic, target group, dates, number of sessions, platform, price (mock), spots, "Varaa kurssi" button | 3, 9, 6 as course images |
| `/kurssit/varaa?kurssi=<slug>` | Request form, pre-filled with the chosen course | — |
| `/kurssit/kiitos` | "Request received. Teija will confirm by email." | 13 |
| `/meista` | Bio (edited from `assets/texts`), achievements list, "Kotona asuvat koirat" cards for the three dogs | 12, 10, 2, 11, 8, 14 |
| `/yhteystiedot` | Mock phone/email, "Riihimäki" (online, so no map), Facebook link, mock Y-tunnus | 1 |
| `/ehdot` | Mock booking and cancellation terms + privacy notice (tietosuojaseloste): what's stored, why, and for how long (requests deleted 12 months after the course ends, done by hand in admin for now) | — |
| `/admin/login` | Teija's log-in | — |
| `/admin` | Requests (default view) | — |
| `/admin/kurssit` | Course list + create/edit form | — |

Header: logo text + nav (Kurssit, Meistä, Yhteystiedot) + "Varaa kurssi" button. Footer: contact, Y-tunnus (mock), Facebook link, link to `/ehdot`.

## Content

**Bio (real, lightly edited into readable sections, facts unchanged):**
- Dogs since 1988, TOKO obedience instructor since 1995, TOKO national team 2005–2007
- Trained 3 obedience champions (tottelevaisuusvalio), 79 first prizes in the winners' class (EVL)
- Service dog trials (tracking, search, messenger, searching trial) at class 3; working champion (käyttövalio) titles in messenger and search
- Awards: silver merit badges from the service dog association and from Australianpaimenkoirat ry, and a bronze hobby badge from the Giant Schnauzer club
- Breeder of Australian Shepherds since 2001, kennel name Särkivaaran
- Dogs: *Särkivaaran Nyt ja Tässä* (7 y, M-26 FI KVA-PKH HK3 JK3 EK2 BH, national service dog championship gold, silver and bronze in the search trial), *Ardiente Macho Ultra Fuerte* (5 y, JK1 BH), *Särkivaaran Oon Niin Malttamaton* (1 y)
- Tone: training is a hobby for her, not a day job. Keep that; it's a selling point ("näppituntuma" from training her own dogs in the same sports).

**Mock courses** (seed script `packages/db/src/seed.ts`), matching her real expertise:
1. TOKO-alkeet verkossa: 6 × 60 min, 89 €
2. Jäljestyksen perusteet: theory + home assignments, 4 × 90 min, 69 €
3. Arjen tottelevaisuus: 5 × 60 min, 59 €
4. Nuoren koiran ohjaaminen: 4 × 60 min, 49 €

Each course has: slug, name, description, target group, start date, weekday + time, session count, platform, price, max participants, image.

## Request form (`/kurssit/varaa`)

Fields: course (select, pre-filled), name, email, phone, dog's name, breed, age, "Mitä toivot kurssilta?" (textarea), consent checkbox linking to `/ehdot`.

- Native HTML validation + the same zod schema on the server (trust boundary).
- Spam protection: a hidden honeypot field + a simple per-IP rate limit in Elysia (in memory). Add a captcha if spam gets through anyway.
- Server: `courseRequest.create` (public) → validates → inserts a `course_request` row → sends 2 emails through Resend (a notification to Teija with a link to the admin view, and "request received" to the customer) → on email failure sets `emailFailed` → returns ok.
- Env (`apps/server/.env.schema`): `RESEND_API_KEY`, `TRAINER_EMAIL` (mock for now), `MAIL_FROM`, `PUBLIC_SITE_URL`, plus the existing `DATABASE_URL`, `BETTER_AUTH_*`, `CORS_ORIGIN`. In dev with no key set, log the email to the console instead of sending.

## Admin view

Better-Auth email + password. Sign-up is turned off; Teija's account is created by the seed script from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env. All admin tRPC procedures use a `protectedProcedure` that checks the session.

**Requests (`/admin`)**
- Table: date, course, name, dog, status, email-failed flag. Filter by status (default: new) and by course.
- Row opens a detail panel with all fields + the message.
- **Vahvista** (confirm) → status `confirmed`, sends the customer a confirmation email (course details + "lasku tulee erikseen", i.e. the invoice comes separately). Optional free-text note included in the email.
- **Hylkää** (decline) → status `declined`, sends a polite decline email with an optional note (e.g. "kurssi täynnä, ilmoitan seuraavasta", course full, I'll let you know about the next one).
- **Poista** (delete) with a confirm dialog, for GDPR deletion requests.
- `mailto:` link on the customer's email for anything else.

**Courses (`/admin/kurssit`)**
- Table: name, start date, confirmed/max, published toggle.
- Create/edit form with all course fields. The image is picked from the photos already in `public/images` (a dropdown); add image upload only if she needs new photos often.

Built with existing `packages/ui` components (card, input, textarea, button, dropdown-menu, sonner). Add `table`, `dialog` and `select` with the shadcn CLI.

## Design

- Light theme, outdoorsy: forest green + warm off-white + one accent pulled from the photos (the maroon of her training jacket). Set as tokens in `packages/ui/src/styles/globals.css`.
- Photos are the design. Use large photos, rounded corners, little decoration. Most photos are portrait, so use portrait cards and a split hero (text left, photo right; stacked on mobile).
- Images: copy `assets/images` to `apps/web/public/images`, resize once to ≤1600 px long edge (`sips`), use `loading="lazy"` and alt text in Finnish. Photo 13 is only 472×600, so use it small.
- Accessibility basics: contrast, focus states, form labels, `lang="fi"`.

## SEO

Finnish `<title>`/description per route, OG image (photo 5), `LocalBusiness` JSON-LD (mock contact info, Riihimäki, sameAs Facebook). The site is a client-rendered SPA, which is fine at this size; pre-render the public pages if search ranking turns out poor.

## Implementation order

1. **Clean up the scaffold**: remove Polar and public sign-up, remove the demo routes, turn off sign-up. Make sure `bun run check-types` and `bun run build` pass.
2. **Data**: `courses.ts` schema, migration, seed (mock courses + admin user).
3. **Layout + theme**: tokens, header, footer, image processing.
4. **Public pages**: home, Kurssit (from DB), Meistä (real bio), Yhteystiedot, Ehdot.
5. **Request form**: form UI, `courseRequest.create`, Resend + console fallback, honeypot, rate limit, thank-you page.
6. **Admin**: log-in, requests list + confirm/decline/delete, course CRUD.
7. **SEO + polish**: meta tags, JSON-LD, mobile check, Lighthouse pass.
8. **Deploy**: the existing docker-compose (web + server + Postgres) on a small VPS (e.g. Hetzner Helsinki) behind Caddy for HTTPS, with daily `pg_dump` backups. Decide when a domain exists.

Checks to leave behind: one test for the request handler (valid input saves a row and triggers 2 emails; a failed email still saves the row with `emailFailed`; a filled honeypot is rejected) and one for confirm (status changes + email sent).

## Swap from mock to real later

- Courses: Teija edits them in the admin view (the seeded courses are marked "Esimerkki").
- Everything marked `// MOCK` in `/yhteystiedot`, the footer and `/ehdot`.
- `TRAINER_EMAIL`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, and a verified sending domain in Resend.
