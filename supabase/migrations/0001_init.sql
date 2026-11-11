-- TAKE.it – databáze
-- Spusť celý soubor v Supabase: SQL Editor → New query → vlož → Run.

create extension if not exists pgcrypto;

-- ============ TABULKY ============

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text check (char_length(name) <= 40),
  points int not null default 0,
  welcome_claimed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Kontakt dárce: vidí ho jen on sám (ostatní přes get_contact po potvrzení)
create table public.contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  methods text[] not null default '{}',
  phone text check (char_length(phone) <= 30),
  messenger text check (char_length(messenger) <= 200),
  updated_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  description text check (char_length(description) <= 1000),
  category text,
  pickup text,
  photos text[] not null default '{}',
  lat double precision,
  lng double precision,
  status text not null default 'active' check (status in ('active', 'reserved', 'given', 'hidden')),
  views int not null default 0,
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);
create index items_feed_idx on public.items (status, created_at desc);
create index items_owner_idx on public.items (owner_id);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  message text check (char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (item_id, requester_id)
);
create index requests_item_idx on public.requests (item_id);
create index requests_requester_idx on public.requests (requester_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  unique (item_id, reporter_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ============ POMOCNÉ FUNKCE ============

create or replace function public.is_real_user() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false and auth.uid() is not null
$$;

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- Nový uživatel (i anonymní) → profil
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Body a uvítací bonus mění jen server
create or replace function public.profiles_before_update() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('app.server', true), '') <> 'on' then
    new.points := old.points;
    new.welcome_claimed := old.welcome_claimed;
  end if;
  return new;
end $$;
create trigger profiles_before_update before update on public.profiles
  for each row execute function public.profiles_before_update();

-- Poloha věci jen přibližně (~500 m), přesné místo se nikdy neukládá
create or replace function public.items_before_write() returns trigger
language plpgsql as $$
begin
  if new.lat is not null then new.lat := round((new.lat * 200)::numeric) / 200; end if;
  if new.lng is not null then new.lng := round((new.lng * 200)::numeric) / 200; end if;
  if tg_op = 'UPDATE' and coalesce(current_setting('app.server', true), '') <> 'on' then
    -- tyhle sloupce mění jen server
    new.report_count := old.report_count;
    new.views := old.views;
    new.owner_id := old.owner_id;
    if old.status = 'hidden' then new.status := 'hidden'; end if;
  end if;
  return new;
end $$;
create trigger items_before_write before insert or update on public.items
  for each row execute function public.items_before_write();

-- Limity proti spamu
create or replace function public.items_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from items where owner_id = new.owner_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Denní limit 10 inzerátů vyčerpán. Zkus to zítra.';
  end if;
  return new;
end $$;
create trigger items_rate_limit before insert on public.items
  for each row execute function public.items_rate_limit();

create or replace function public.requests_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from requests where requester_id = new.requester_id and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'Denní limit 20 žádostí vyčerpán. Zkus to zítra.';
  end if;
  return new;
end $$;
create trigger requests_rate_limit before insert on public.requests
  for each row execute function public.requests_rate_limit();

-- Body za zveřejnění
create or replace function public.items_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.server', 'on', true);
  update profiles set points = points + 50 where id = new.owner_id;
  return new;
end $$;
create trigger items_after_insert after insert on public.items
  for each row execute function public.items_after_insert();

-- Nová žádost → upozornění dárci
create or replace function public.requests_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  it items;
  who text;
begin
  select * into it from items where id = new.item_id;
  select coalesce(nullif(name, ''), 'Někdo') into who from profiles where id = new.requester_id;
  insert into notifications (user_id, type, title, body, data)
  values (it.owner_id, 'request', who || ' chce „' || it.title || '“ 👋', coalesce(new.message, ''),
          jsonb_build_object('item_id', it.id, 'request_id', new.id));
  return new;
end $$;
create trigger requests_after_insert after insert on public.requests
  for each row execute function public.requests_after_insert();

-- Nahlášení: po 3 nahlášeních se inzerát skryje
create or replace function public.reports_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.server', 'on', true);
  update items set report_count = report_count + 1 where id = new.item_id;
  update items set status = 'hidden' where id = new.item_id and report_count >= 3;
  return new;
end $$;
create trigger reports_after_insert after insert on public.reports
  for each row execute function public.reports_after_insert();

-- ============ RPC (volá appka) ============

-- Věci v okolí (RLS platí, protože security invoker)
create or replace function public.nearby_items(p_lat double precision, p_lng double precision, p_km double precision default 20)
returns table (
  id uuid, owner_id uuid, owner_name text, title text, description text, category text, pickup text,
  photos text[], lat double precision, lng double precision, status text, views int,
  created_at timestamptz, distance_km double precision
)
language sql stable as $$
  select * from (
    select i.id, i.owner_id, p.name, i.title, i.description, i.category, i.pickup, i.photos, i.lat, i.lng,
           i.status, i.views, i.created_at,
           case when i.lat is null or p_lat is null then null else
             6371 * 2 * asin(sqrt(power(sin(radians(i.lat - p_lat) / 2), 2) +
               cos(radians(p_lat)) * cos(radians(i.lat)) * power(sin(radians(i.lng - p_lng) / 2), 2)))
           end as distance_km
    from items i join profiles p on p.id = i.owner_id
    where i.status in ('active', 'reserved') and i.expires_at > now()
  ) x
  where x.distance_km is null or x.distance_km <= p_km
  order by x.created_at desc
  limit 300
$$;

create or replace function public.increment_view(p_item uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.server', 'on', true);
  update items set views = views + 1 where id = p_item and owner_id <> auth.uid();
end $$;

create or replace function public.accept_request(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r requests;
  it items;
begin
  select * into r from requests where id = p_request;
  select * into it from items where id = r.item_id;
  if it.owner_id is distinct from auth.uid() then raise exception 'Tohle není tvoje věc.'; end if;
  if it.status <> 'active' then raise exception 'Věc už není aktivní.'; end if;
  if r.status <> 'pending' then raise exception 'Žádost už byla vyřízená.'; end if;

  update requests set status = 'accepted' where id = r.id;
  update items set status = 'reserved' where id = it.id;
  insert into notifications (user_id, type, title, body, data)
  values (r.requester_id, 'accepted', '„' || it.title || '“ je tvoje! 🎉', 'Dárce potvrdil tvoji žádost – kontakt je odemčený.',
          jsonb_build_object('item_id', it.id));

  insert into notifications (user_id, type, title, body, data)
  select requester_id, 'declined', '„' || it.title || '“ už je zamluvená', 'Dárce vybral někoho jiného. Zkus jinou věc v okolí.',
         jsonb_build_object('item_id', it.id)
  from requests where item_id = it.id and status = 'pending';
  update requests set status = 'declined' where item_id = it.id and status = 'pending';
end $$;

create or replace function public.decline_request(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r requests;
  it items;
begin
  select * into r from requests where id = p_request;
  select * into it from items where id = r.item_id;
  if it.owner_id is distinct from auth.uid() then raise exception 'Tohle není tvoje věc.'; end if;
  update requests set status = 'declined' where id = r.id and status = 'pending';
end $$;

create or replace function public.mark_given(p_item uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update items set status = 'given' where id = p_item and owner_id = auth.uid() and status = 'reserved';
  if found then
    perform set_config('app.server', 'on', true);
    update profiles set points = points + 100 where id = auth.uid();
  end if;
end $$;

-- Uvítací dárek z onboardingu (jednou na účet)
create or replace function public.claim_welcome() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.server', 'on', true);
  update profiles set points = points + 100, welcome_claimed = true
  where id = auth.uid() and welcome_claimed = false;
end $$;

-- Kontakt dárce: jen pro majitele nebo potvrzeného zájemce
create or replace function public.get_contact(p_item uuid)
returns table (methods text[], phone text, messenger text)
language sql stable security definer set search_path = public as $$
  select c.methods, c.phone, c.messenger
  from items i join contacts c on c.user_id = i.owner_id
  where i.id = p_item
    and (
      i.owner_id = auth.uid()
      or exists (select 1 from requests r where r.item_id = i.id and r.requester_id = auth.uid() and r.status = 'accepted')
    )
$$;

-- Smazání účtu (povinné pro App Store)
create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

-- ============ RLS ============

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.items enable row level security;
alter table public.requests enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;

create policy "profiles read" on public.profiles for select to anon, authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "contacts own" on public.contacts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "items read" on public.items for select to anon, authenticated using (
  owner_id = auth.uid()
  or (status in ('active', 'reserved') and expires_at > now() and not public.is_blocked_between(auth.uid(), owner_id))
);
create policy "items insert" on public.items for insert to authenticated
  with check (owner_id = auth.uid() and public.is_real_user());
create policy "items update own" on public.items for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "items delete own" on public.items for delete to authenticated using (owner_id = auth.uid());

create policy "requests read" on public.requests for select to authenticated using (
  requester_id = auth.uid() or exists (select 1 from items i where i.id = item_id and i.owner_id = auth.uid())
);
create policy "requests insert" on public.requests for insert to authenticated with check (
  requester_id = auth.uid() and public.is_real_user() and exists (
    select 1 from items i where i.id = item_id and i.status = 'active' and i.owner_id <> auth.uid()
      and not public.is_blocked_between(auth.uid(), i.owner_id)
  )
);
create policy "requests cancel own" on public.requests for update to authenticated
  using (requester_id = auth.uid()) with check (requester_id = auth.uid() and status = 'cancelled');

create policy "reports insert" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

create policy "blocks own" on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy "push own" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notifications own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ STORAGE (fotky) ============

insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict do nothing;

create policy "photos upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
