#!/bin/sh
# One-shot DB bootstrap on every `up`: wait for GoTrue to create auth.users, sync the PostgREST
# login password, apply each migration exactly once (ledger: public.schema_migrations, one
# transaction per migration), run the seed once, then (re)apply service-role grants.
set -e

export PGPASSWORD="${POSTGRES_PASSWORD:?}"
PSQL="psql -h db -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
Q="psql -h db -U postgres -d postgres -v ON_ERROR_STOP=1 -tAq"

echo "[db-init] waiting for auth.users (GoTrue migrations)"
until [ "$($Q -c "select to_regclass('auth.users') is not null" 2>/dev/null)" = "t" ]; do sleep 2; done

echo "alter role authenticator with login password :'pw';" | $PSQL -v pw="$PGPASSWORD"

$PSQL <<'SQL'
create table if not exists public.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
alter table public.schema_migrations enable row level security;
revoke all on public.schema_migrations from public, anon, authenticated;
SQL

for f in /supabase/migrations/*.sql; do
  version=$(basename "$f" .sql)
  case "$version" in *[!A-Za-z0-9_]*) echo "[db-init] bad migration name $version"; exit 1 ;; esac
  if [ "$($Q -c "select 1 from public.schema_migrations where version = '$version'")" = "1" ]; then
    continue
  fi
  echo "[db-init] applying $version"
  $PSQL -1 -f "$f" -c "insert into public.schema_migrations (version) values ('$version')"
done

if [ "$($Q -c "select 1 from public.schema_migrations where version = 'seed'")" != "1" ] && [ -f /supabase/seed.sql ]; then
  echo "[db-init] seeding"
  $PSQL -1 -f /supabase/seed.sql -c "insert into public.schema_migrations (version) values ('seed')"
fi

$PSQL <<'SQL'
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
notify pgrst, 'reload schema';
SQL
echo "[db-init] done"
