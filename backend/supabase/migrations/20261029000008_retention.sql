-- Daily activity and retention, read with the service role or in the SQL editor. Players never see
-- these: the views run as their owner (so they can read daily_results), and every client role is
-- revoked below.
--
-- A cohort is the day a player first banked a Daily. dN counts cohort players who banked again exactly
-- N days later; the *_pct columns stay null until day N is over (today is still being played).

create or replace view public.analytics_daily_active as
with first_day as (
  select user_id, min(day) as d0 from public.daily_results group by user_id
)
select r.day,
       count(*)::int                                          as players,
       count(*) filter (where f.d0 = r.day)::int              as new_players,
       count(*) filter (where f.d0 < r.day)::int              as returning_players,
       round(avg(r.points))::int                              as avg_points,
       round(avg(r.solved), 2)                                as avg_solved
  from public.daily_results r
  join first_day f using (user_id)
 group by r.day
 order by r.day;

create or replace view public.analytics_retention as
with first_day as (
  select user_id, min(day) as d0 from public.daily_results group by user_id
),
returned as (
  select f.d0, f.user_id,
         bool_or(r.day = f.d0 + 1) as d1,
         bool_or(r.day = f.d0 + 3) as d3,
         bool_or(r.day = f.d0 + 7) as d7
    from first_day f
    join public.daily_results r on r.user_id = f.user_id
   group by f.d0, f.user_id
)
select d0                                                     as cohort_day,
       count(*)::int                                          as players,
       count(*) filter (where d1)::int                        as d1,
       count(*) filter (where d3)::int                        as d3,
       count(*) filter (where d7)::int                        as d7,
       case when d0 + 1 < public.daily_day() then round(100.0 * count(*) filter (where d1) / count(*), 1) end as d1_pct,
       case when d0 + 3 < public.daily_day() then round(100.0 * count(*) filter (where d3) / count(*), 1) end as d3_pct,
       case when d0 + 7 < public.daily_day() then round(100.0 * count(*) filter (where d7) / count(*), 1) end as d7_pct
  from returned
 group by d0
 order by d0;

revoke all on public.analytics_daily_active, public.analytics_retention from public, anon, authenticated;
grant select on public.analytics_daily_active, public.analytics_retention to service_role;
