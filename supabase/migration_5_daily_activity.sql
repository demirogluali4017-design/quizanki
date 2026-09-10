-- ============================================
-- Migration 5: Günlük Aktivite Kaydı + Genel Ayarlar
-- Supabase SQL Editor'de çalıştırın.
-- Additive'dir: mevcut flashcards, test_results, match_results
-- tablolarına HİÇ dokunmaz.
-- ============================================

create table if not exists public.daily_activity (
  id uuid primary key default uuid_generate_v4(),
  activity_date date not null unique,
  reviews_done integer not null default 0,
  new_words_done integer not null default 0,
  created_at timestamp with time zone default now()
);

create index if not exists idx_daily_activity_date
  on public.daily_activity (activity_date desc);

alter table public.daily_activity enable row level security;

create policy "Herkes okuyabilir (daily_activity)"
  on public.daily_activity for select using (true);
create policy "Herkes ekleyebilir (daily_activity)"
  on public.daily_activity for insert with check (true);
create policy "Herkes güncelleyebilir (daily_activity)"
  on public.daily_activity for update using (true);

-- Uygulama genelinde tek bir ayar satırı (hesap sistemi olmadığı için
-- "kullanıcı ayarı" değil, "uygulama ayarı" olarak tutuluyor).
create table if not exists public.app_settings (
  id integer primary key default 1,
  daily_new_goal integer not null default 10,
  daily_review_goal integer not null default 30,
  updated_at timestamp with time zone default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into public.app_settings (id) values (1)
  on conflict (id) do nothing;

alter table public.app_settings enable row level security;

create policy "Herkes okuyabilir (app_settings)"
  on public.app_settings for select using (true);
create policy "Herkes güncelleyebilir (app_settings)"
  on public.app_settings for update using (true);
