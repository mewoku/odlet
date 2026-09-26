# ODLET production (shared server)

Live at **https://odlet.xyz** on the shared server (169.58.10.252), next to other services.
Design rule: this stack publishes **one** port, `127.0.0.1:8130` (the gateway). Postgres, GoTrue,
PostgREST and the Deno function are only reachable inside the `odlet` Docker network. The host
nginx terminates TLS and only accepts Cloudflare (`$is_cloudflare`).

```
Cloudflare (Full) → host nginx :443 (odlet.xyz, self-signed origin cert)
                  → 127.0.0.1:8130 gateway (nginx) ─┬─ /auth/v1/*          GoTrue (anonymous sign-in)
                                                     ├─ /rest/v1/*          PostgREST
                                                     ├─ /functions/v1/wallet-link   Deno
                                                     └─ /*                  Next.js site + /unity WebGL
```

## Files

| Path | What |
|---|---|
| `docker-compose.yml` | the stack (project name `odlet`) |
| `postgres/init/00-roles.sql` | Supabase roles, `auth.uid()`, `extensions.citext` (first DB init only) |
| `db-init/db-init.sh` | applies `backend/supabase/migrations` once each (ledger `public.schema_migrations`), seed, grants |
| `gateway/nginx.conf` | routing + per-IP rate limits (real IP from `CF-Connecting-IP`) |
| `nginx-host/odlet.xyz.conf` | host nginx site (installed to `/etc/nginx/sites-available/odlet.xyz`) |
| `gen-env.mjs` | writes `.env` with fresh secrets (never overwrites; `.env` is git-ignored) |

## Deploy / update (on the server, in `~/odlet`)

```bash
# copy the repo subset (backend, packages/core, web incl. web/public/unity, deploy) to ~/odlet, then:
cd ~/odlet/deploy/prod
node gen-env.mjs odlet.xyz 8130          # first time only
docker compose --env-file .env up -d --build
docker compose --env-file .env --profile tools run --rm publisher   # answer keys, shop, bosses
```

Daily content publish (user crontab, no root needed):
```
15 0 * * * cd ~/odlet/deploy/prod && docker compose --env-file .env --profile tools run --rm publisher >> ~/odlet/publisher.log 2>&1
```

## Keys

* `ANON_KEY` is public: it's in the app (`client/Assets/Ronriku/Resources/ronriku-online.json`,
  `releaseUrl` = `https://odlet.xyz`) and in the site bundle.
* `SERVICE_ROLE_KEY`, `JWT_SECRET`, `POSTGRES_PASSWORD` stay in `~/odlet/deploy/prod/.env` (mode 600).
  Rotating `JWT_SECRET` invalidates every session and requires a new app build with the new anon key.

## Marketplace

`NEXT_PUBLIC_MARKET_OPEN=false` keeps the market and all SOL purchases on "coming soon". To open:
set it to `true`, fill `NEXT_PUBLIC_PAYMENT_RECIPIENT` and `MINT_AUTHORITY_SECRET_KEY`, then
`docker compose --env-file .env up -d --build web`.
