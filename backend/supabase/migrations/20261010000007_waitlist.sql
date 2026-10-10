-- Launch waitlist (website form, Cloudflare Turnstile checked by the Next.js route /api/waitlist).
--
-- Only the server writes here, with the service role, after the captcha passes. RLS is on with no
-- policies, so anon/authenticated clients can neither read nor insert addresses.

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) between 3 and 254 and email = lower(email)),
  source text not null default 'web' check (char_length(source) <= 32),
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_key on public.waitlist (email);

alter table public.waitlist enable row level security;
revoke all on table public.waitlist from public, anon, authenticated;
grant select, insert on table public.waitlist to service_role;
