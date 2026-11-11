-- TAKE.it – veřejné statistiky pro onboarding (skutečná čísla z databáze)
-- Spusť v Supabase: SQL Editor → New query → vlož → Run.

create or replace function public.public_stats() returns json
language sql stable security definer set search_path = public, auth as $$
  select json_build_object(
    'items', (select count(*) from items where status <> 'hidden'),
    'given', (select count(*) from items where status = 'given'),
    'people', (select count(*) from profiles p join auth.users u on u.id = p.id where coalesce(u.is_anonymous, false) = false)
  )
$$;

grant execute on function public.public_stats() to anon, authenticated;
