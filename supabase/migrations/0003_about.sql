-- O mně: pro ty, kdo hledají věci zdarma (dárce to uvidí u žádosti)
alter table public.profiles
  add column if not exists about text not null default '' check (char_length(about) <= 300),
  add column if not exists take_reasons text[] not null default '{}' check (cardinality(take_reasons) <= 6);
