-- ============================================
-- Migration 6: SM-2 Geçiş Sistemi (Öğrenme Kutusu)
-- Supabase SQL Editor'de çalıştırın.
-- Additive'dir: repetitions/interval/ease_factor/next_review_date
-- gibi hiçbir SM-2 alanına DOKUNMAZ, sadece yeni izleme sütunları
-- ekler.
-- ============================================

alter table public.flashcards
  add column if not exists in_learning_phase boolean not null default false,
  add column if not exists learning_streak integer not null default 0;

-- ÖNEMLİ GERİYE UYUMLULUK: Migration öncesi eklenmiş ve hiç tekrar
-- edilmemiş (repetitions = 0) kartlar "Sıfırdan Öğren" modunda
-- kaybolmasın diye bunları da öğrenme kutusuna dahil ediyoruz.
-- Bu satır SADECE yeni in_learning_phase sütununu günceller,
-- repetitions/interval/ease_factor'a dokunmaz.
update public.flashcards
  set in_learning_phase = true
  where repetitions = 0 and in_learning_phase = false;

alter table public.app_settings
  add column if not exists learning_phase_threshold integer not null default 2,
  add column if not exists auto_promote_enabled boolean not null default true;
