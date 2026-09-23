alter table public.app_settings
  add column if not exists last_seen_at timestamp with time zone;
