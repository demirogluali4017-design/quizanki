-- ============================================
-- Migration 2: Öğrenme Motoru (Weak Words + İstatistik)
-- Supabase SQL Editor'de çalıştırın.
-- Tamamen ADDITIVE'dir: mevcut satırları, mevcut sütunları
-- ve SM-2 alanlarını (repetitions/interval/ease_factor/
-- next_review_date) hiçbir şekilde değiştirmez veya silmez.
-- Yeni sütunlar DEFAULT değerle eklendiği için mevcut
-- kartlar geriye dönük uyumlu kalır.
-- ============================================

alter table public.flashcards
  add column if not exists correct_count integer not null default 0,
  add column if not exists incorrect_count integer not null default 0,
  add column if not exists struggle_count integer not null default 0,
  add column if not exists is_weak boolean not null default false,
  add column if not exists last_reviewed_at timestamp with time zone;

-- Zayıf kelime sorgusu için indeks
create index if not exists idx_flashcards_is_weak
  on public.flashcards (is_weak)
  where is_weak = true;

-- NOT: "learning_stage" (Yeni/Öğreniliyor/Pekişiyor/Uzun süreli hafıza) ve
-- kart durumu (Tekrar zamanı geldi/Gecikmiş/Güçlü/Zayıf) kalıcı bir sütun
-- olarak TUTULMUYOR — bilerek. Bu durumlar repetitions, ease_factor,
-- interval ve next_review_date değerlerinden lib/studyEngine.ts içinde
-- anlık olarak hesaplanıyor. Böylece veri modeli şişmiyor ve tutarsız
-- (stale) durum riski oluşmuyor.
