-- ============================================
-- Migration 3: Test Modu Skorları
-- Supabase SQL Editor'de çalıştırın.
-- Additive'dir: mevcut flashcards tablosuna dokunmaz.
-- ============================================

create table if not exists public.test_results (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  score integer not null,
  correct_count integer not null,
  total_questions integer not null,
  best_streak integer not null default 0
);

create index if not exists idx_test_results_created_at
  on public.test_results (created_at desc);

alter table public.test_results enable row level security;

create policy "Herkes okuyabilir (test_results)"
  on public.test_results
  for select
  using (true);

create policy "Herkes ekleyebilir (test_results)"
  on public.test_results
  for insert
  with check (true);
