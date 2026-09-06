-- ============================================
-- Flashcard / Anki Klonu — Supabase Şeması
-- Supabase Dashboard > SQL Editor'de çalıştırın
-- ============================================

create extension if not exists "uuid-ossp";

create table if not exists public.flashcards (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  word text not null,
  preposition text,
  meaning text not null,
  example_sentence text,
  repetitions integer not null default 0,
  interval integer not null default 1,
  ease_factor double precision not null default 2.5,
  next_review_date timestamp with time zone not null default now()
);

-- Çalışma modu sorgusu (next_review_date <= now()) için indeks
create index if not exists idx_flashcards_next_review_date
  on public.flashcards (next_review_date);

-- Arama sayfası için basit metin indeksleri
create index if not exists idx_flashcards_word
  on public.flashcards (word);

-- ============================================
-- Row Level Security (RLS)
-- Bu proje "ortak havuz" mantığıyla çalıştığı için
-- herkese okuma izni veriyoruz. Yazma işlemleri
-- service_role anahtarı üzerinden (API route) yapılır
-- ve RLS'yi bypass eder.
-- ============================================

alter table public.flashcards enable row level security;

create policy "Herkes okuyabilir"
  on public.flashcards
  for select
  using (true);

-- İsteğe bağlı: Eğer client tarafından da silme/güncelleme
-- yapılmasını istiyorsanız (bu projede /study ve /words
-- sayfaları anon key ile update/delete çağırıyor), aşağıdaki
-- politikaları da açın. Üretimde bunun yerine bir Server
-- Action / API Route üzerinden service_role kullanmanız
-- önerilir.

create policy "Herkes güncelleyebilir"
  on public.flashcards
  for update
  using (true);

create policy "Herkes silebilir"
  on public.flashcards
  for delete
  using (true);
