-- ============================================
-- Migration 8: Sadece sahip erişsin
-- Supabase Dashboard > SQL Editor'de BİR KEZ çalıştırın.
-- Aşağıdaki e-posta, giriş yapacağın hesapla aynı olmalı.
-- ============================================

create table if not exists public.app_owner (
  id integer primary key default 1,
  email text not null,
  constraint app_owner_singleton check (id = 1)
);

insert into public.app_owner (id, email)
values (1, 'demirogluali4017@gmail.com')
on conflict (id) do update set email = excluded.email;

alter table public.app_owner enable row level security;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_owner
    where id = 1
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_owner() from public;
revoke all on function public.is_owner() from anon;
grant execute on function public.is_owner() to authenticated;

-- Eski herkese açık politikalar
drop policy if exists "Herkes okuyabilir" on public.flashcards;
drop policy if exists "Herkes güncelleyebilir" on public.flashcards;
drop policy if exists "Herkes silebilir" on public.flashcards;
drop policy if exists "Herkes ekleyebilir" on public.flashcards;

drop policy if exists "Herkes okuyabilir (daily_activity)" on public.daily_activity;
drop policy if exists "Herkes ekleyebilir (daily_activity)" on public.daily_activity;
drop policy if exists "Herkes güncelleyebilir (daily_activity)" on public.daily_activity;

drop policy if exists "Herkes okuyabilir (app_settings)" on public.app_settings;
drop policy if exists "Herkes güncelleyebilir (app_settings)" on public.app_settings;

drop policy if exists "Herkes okuyabilir (word_groups)" on public.word_groups;
drop policy if exists "Herkes ekleyebilir (word_groups)" on public.word_groups;
drop policy if exists "Herkes silebilir (word_groups)" on public.word_groups;

do $$
begin
  if to_regclass('public.test_results') is not null then
    execute 'drop policy if exists "Herkes okuyabilir (test_results)" on public.test_results';
    execute 'drop policy if exists "Herkes ekleyebilir (test_results)" on public.test_results';
    execute 'drop policy if exists "Sahip erişebilir" on public.test_results';
    execute $p$
      create policy "Sahip erişebilir"
        on public.test_results
        for all
        to authenticated
        using (public.is_owner())
        with check (public.is_owner())
    $p$;
  end if;

  if to_regclass('public.match_results') is not null then
    execute 'drop policy if exists "Herkes okuyabilir (match_results)" on public.match_results';
    execute 'drop policy if exists "Herkes ekleyebilir (match_results)" on public.match_results';
    execute 'drop policy if exists "Sahip erişebilir" on public.match_results';
    execute $p$
      create policy "Sahip erişebilir"
        on public.match_results
        for all
        to authenticated
        using (public.is_owner())
        with check (public.is_owner())
    $p$;
  end if;
end $$;

create policy "Sahip erişebilir"
  on public.flashcards
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Sahip erişebilir"
  on public.daily_activity
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Sahip erişebilir"
  on public.app_settings
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Sahip erişebilir"
  on public.word_groups
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

