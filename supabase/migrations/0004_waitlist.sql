-- Čekací listina z webu (landing page). Kdokoli může přidat e-mail, nikdo ho nemůže číst přes API.
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source text check (char_length(source) <= 30),
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
drop policy if exists "waitlist insert" on public.waitlist;
create policy "waitlist insert" on public.waitlist for insert to anon, authenticated with check (true);
grant insert (email, source) on public.waitlist to anon, authenticated;
