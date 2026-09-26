-- Bootstraps the roles, schemas and helpers the Supabase services and our migrations expect.
-- Runs once, on first DB init, as the superuser — before GoTrue's migrations and ours.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

-- PostgREST logs in as authenticator and switches role per request. The placeholder password is
-- replaced with POSTGRES_PASSWORD by db-init on every start.
create role authenticator noinherit login password 'db-init-syncs-this';
grant anon, authenticated, service_role to authenticator;

-- GoTrue creates its tables in auth; our migrations reference auth.users and auth.uid().
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt()->>'sub', '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select auth.jwt()->>'role'
$$;
grant execute on function auth.jwt(), auth.uid(), auth.role() to anon, authenticated, service_role;

-- Supabase keeps extensions in their own schema; our schema uses extensions.citext.
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create extension if not exists citext with schema extensions;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
