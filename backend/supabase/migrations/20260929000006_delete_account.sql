-- Account deletion (Google Play: apps that create accounts must offer in-app deletion + a web link).
--
-- Deletes the caller's auth.users row. Every per-user table references auth.users with
-- `on delete cascade` (profiles, level_progress, daily_results, boss_attempts, listings as seller,
-- friendships, transactions, wallet_nonces), and GoTrue's own sessions/refresh tokens cascade too.
-- figures.owner_id and listings.buyer_id are `on delete set null`: minted figures outlive the account
-- but no longer point at anyone. Nothing is kept that identifies the player.

create or replace function public.delete_my_account() returns jsonb
language plpgsql volatile security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  delete from auth.users where id = v_uid;
  return jsonb_build_object('deleted', true);
end $$;

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
