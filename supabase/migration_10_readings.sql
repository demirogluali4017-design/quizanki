-- Günlük okuma parçaları. Kaynak metin saklanmaz, yalnız başlık ve adres durur.
create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  created_on date not null,
  topic text not null,
  title text not null,
  minutes int not null default 4,
  source_note text,
  source_title text,
  source_url text,
  paragraphs jsonb not null,
  summary_tr text,
  questions jsonb not null
);

alter table public.readings enable row level security;
