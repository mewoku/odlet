-- Public profile stats for /u/<handle> (web profile page).
--
-- level_progress and daily_results stay owner-only under RLS. This read-only RPC exposes *aggregates*
-- only, for any handle: adventure clears and stars per world, completed Dailies, the collection size
-- and the last Daily results (day, trials solved, points, rating after). Daily points and ranks are
-- already public through leaderboard('daily'); times, answers, outcomes and proofs are never returned.

create or replace function public.profile_stats(p_handle text, p_days int default 7) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid;
  v_days int := least(greatest(coalesce(p_days, 7), 1), 30);
  v_worlds jsonb;
  v_daily jsonb;
begin
  if p_handle is null or p_handle !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'invalid_handle'; end if;
  select p.id into v_id from public.profiles p where p.handle = p_handle::extensions.citext;
  if v_id is null then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object('world', w.world, 'cleared', w.cleared, 'stars', w.stars, 'boss', w.boss)
                            order by w.world), '[]'::jsonb)
    into v_worlds
    from (select lp.world, count(*)::int as cleared, sum(lp.stars)::int as stars, bool_or(lp.level = 11) as boss
            from public.level_progress lp where lp.user_id = v_id group by lp.world) w;

  select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'solved', d.solved, 'points', d.points,
                                               'rating_after', d.rating_after) order by d.day desc), '[]'::jsonb)
    into v_daily
    from (select dr.day, dr.solved, dr.points, dr.rating_after from public.daily_results dr
           where dr.user_id = v_id order by dr.day desc limit v_days) d;

  return jsonb_build_object(
    'user_id', v_id,
    'worlds', v_worlds,
    'daily', v_daily,
    'completed_dailies', (select p.completed_dailies from public.profiles p where p.id = v_id),
    'figures', (select count(*)::int from public.figures f where f.owner_id = v_id));
end $$;

revoke all on function public.profile_stats(text, int) from public, anon, authenticated;
grant execute on function public.profile_stats(text, int) to anon, authenticated;
