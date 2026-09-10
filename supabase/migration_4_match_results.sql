-- ============================================
-- Migration 4: Eşleştir Modu Sonuçları
-- Supabase SQL Editor'de çalıştırın.
-- Additive'dir: mevcut tablolara dokunmaz.
-- ============================================

create table if not exists public.match_results (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  pairs_count integer not null,
  duration_ms integer not null,
  mistakes integer not null default 0
);

create index if not exists idx_match_results_created_at
  on public.match_results (created_at desc);

alter table public.match_results enable row level security;

create policy "Herkes okuyabilir (match_results)"
  on public.match_results
  for select
  using (true);

create policy "Herkes ekleyebilir (match_results)"
  on public.match_results
  for insert
  with check (true);
