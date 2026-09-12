-- ============================================
-- Migration 7: Eş Anlamlı Gruplar
-- Supabase SQL Editor'de çalıştırın.
-- Additive'dir: flashcards tablosuna sadece nullable bir
-- group_id sütunu ekler (varsayılan NULL = hiçbir mevcut
-- kelime etkilenmez), mevcut SM-2 alanlarına dokunmaz.
-- ============================================

create table if not exists public.word_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default now()
);

alter table public.flashcards
  add column if not exists group_id uuid references public.word_groups(id) on delete set null;

create index if not exists idx_flashcards_group_id
  on public.flashcards (group_id);

alter table public.word_groups enable row level security;

create policy "Herkes okuyabilir (word_groups)"
  on public.word_groups for select using (true);
create policy "Herkes ekleyebilir (word_groups)"
  on public.word_groups for insert with check (true);
create policy "Herkes silebilir (word_groups)"
  on public.word_groups for delete using (true);
