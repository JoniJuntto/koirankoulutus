# Deploy koirankoulutus.com

Deploy this repo on the existing UpCloud server. Caddy already terminates HTTPS for the other sites. This app does not bind ports 80, 443, 3000, 3001, or 5432.

Caddy on the host proxies two hostnames to localhost-only ports:

| Public URL | Host port | Container |
| --- | --- | --- |
| `https://koirankoulutus.com` | `127.0.0.1:18473` | web (nginx, port 80) |
| `https://api.koirankoulutus.com` | `127.0.0.1:18474` | API (port 3000) |

Postgres stays on the Compose network and is not published on the host. `www.koirankoulutus.com` redirects to the apex host. The site and the API are different origins: the web build bakes in `VITE_SERVER_URL`, and auth cookies are `SameSite=None; Secure`.

Plain `docker compose up` publishes `3001`, `3000`, and `5432`. Production always uses the second Compose file below.

## 1. DNS

Point these records at the server's existing public address (the same one the other sites use). Add AAAA records only if those other sites already have them.

- `koirankoulutus.com` A
- `www.koirankoulutus.com` A (or CNAME to the apex)
- `api.koirankoulutus.com` A

Do not open `18473` or `18474` in the UpCloud firewall. Leave only the ports Caddy already uses (80 and 443) plus SSH.

Check from your machine:

```bash
dig +short koirankoulutus.com
dig +short www.koirankoulutus.com
dig +short api.koirankoulutus.com
```

## 2. Server prerequisites

SSH in. Docker and Compose are already installed for the other projects. `!override` in the production Compose file needs Compose 2.24 or newer:

```bash
docker compose version
```

Confirm the high ports are free:

```bash
ss -ltn | grep -E '18473|18474' || echo "ports free"
```

If either port is taken, pick another pair above 1024 and use that pair in both the Compose file and the Caddyfile.

## 3. Clone

Put the app in its own directory, next to the other projects but not inside one of them:

```bash
sudo mkdir -p /opt/koirankoulutus
sudo chown "$USER:$USER" /opt/koirankoulutus
git clone git@github.com:JoniJuntto/koirankoulutus.git /opt/koirankoulutus
cd /opt/koirankoulutus
```

The GitHub remote is SSH. If `git clone` fails, add a read-only deploy key for this repo on the server.

## 4. Environment files

These files are gitignored. Create them on the server before the first build. Compose reads `apps/web/.env` and `apps/server/.env` as build secrets, and it reads `POSTGRES_PASSWORD` from a `.env` file in `/opt/koirankoulutus`.

Generate a database password and an auth secret:

```bash
openssl rand -base64 24
openssl rand -base64 32
```

`/opt/koirankoulutus/.env`:

```bash
POSTGRES_PASSWORD=paste-the-first-value
```

`apps/web/.env`:

```bash
NODE_ENV=production
VITE_SERVER_URL=https://api.koirankoulutus.com
```

`apps/server/.env`:

```bash
NODE_ENV=production
BETTER_AUTH_SECRET=KwS15CSUf059kqjJgqR/yBZYsEAuHWSenNpsvnTvydo=
BETTER_AUTH_URL=https://api.koirankoulutus.com
CORS_ORIGIN=https://koirankoulutus.com
DATABASE_URL=postgresql://postgres:WqmXOUDKJM540ugZKxVjSqBY97ZWegjm@postgres:5432/koirankoulutus
PUBLIC_SITE_URL=https://koirankoulutus.com
RESEND_API_KEY=
MAIL_FROM="Koirankoulutus Nyt ja Tässä <onboarding@resend.dev>"
TRAINER_EMAIL=teija@example.com
ADMIN_EMAIL=teija@example.com
ADMIN_PASSWORD=b4l3ddK4r1N
```

`DATABASE_URL` must use the hostname `postgres` (the Compose service), not `localhost`. The password must match `POSTGRES_PASSWORD`. Compose injects `DATABASE_URL` itself at runtime; the copy in `apps/server/.env` is what the image build reads.

`BETTER_AUTH_SECRET` must be at least 32 characters. `ADMIN_PASSWORD` must be at least 8.

On first boot the API creates the admin user if that email is not already in the database. Changing `ADMIN_PASSWORD` later does not update an existing user.

Leave `RESEND_API_KEY` empty to print mail to the API logs. For real mail, set a Resend key and a `MAIL_FROM` address on a domain verified in Resend. `TRAINER_EMAIL` receives new course-request notifications.

`VITE_SERVER_URL` is compiled into the static site. Changing it later requires a web image rebuild.

## 5. Production Compose file

Create `/opt/koirankoulutus/docker-compose.prod.yml`. The `!override` tag replaces the published ports from `docker-compose.yml`. Without it, Compose appends ports and still binds `3000`, `3001`, and `5432`.

```yaml
services:
  web:
    build:
      args:
        VITE_SERVER_URL: https://api.koirankoulutus.com
    ports: !override
      - "127.0.0.1:18473:80"

  server:
    environment:
      CORS_ORIGIN: https://koirankoulutus.com
    ports: !override
      - "127.0.0.1:18474:3000"

  postgres:
    ports: !override []
```

Check the merged config before starting anything. The web and API ports must be `127.0.0.1:18473` and `127.0.0.1:18474` only. Postgres must have no `ports` entry.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

## 6. Build and start

```bash
cd /opt/koirankoulutus
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

The API runs database migrations on startup, then creates the admin user and seeds example courses when those tables are empty.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f server
```

Wait until the API log says it is running and `ps` shows all three services healthy. Then:

```bash
curl -fsS http://127.0.0.1:18474/
curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18473/
```

The API should print `OK`. The site should print `200`.

## 7. Global Caddyfile

Edit the Caddyfile the other sites already use, usually `/etc/caddy/Caddyfile`. If that file imports a directory (`import /etc/caddy/sites/*` or similar), add a new file there instead of pasting into the main file.

```caddyfile
koirankoulutus.com {
	reverse_proxy 127.0.0.1:18473
}

www.koirankoulutus.com {
	redir https://koirankoulutus.com{uri} permanent
}

api.koirankoulutus.com {
	reverse_proxy 127.0.0.1:18474
}
```

Validate, then reload. Reload does not drop the other sites.

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy obtains the certificates on reload. DNS for all three names must already point at this server. If a certificate fails, read `journalctl -u caddy -n 80 --no-pager`.

## 8. Check the public site

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" https://koirankoulutus.com/
curl -fsS https://api.koirankoulutus.com/
curl -fsS -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.koirankoulutus.com/
```

Expect `200` from the site, `OK` from the API, and a `301` from `www` to `https://koirankoulutus.com/`.

In a browser, open `https://koirankoulutus.com`, sign in as `ADMIN_EMAIL`, and confirm a page that calls the API still loads after refresh.

## Updates

On the server:

```bash
cd /opt/koirankoulutus
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Do not run `docker compose up` without `-f docker-compose.prod.yml`. Do not run `docker compose down -v`; `-v` deletes the database volume.

Logs and a database dump:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres koirankoulutus > "koirankoulutus-$(date +%F).sql"
```
