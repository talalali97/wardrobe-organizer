-- =========================================================
-- Wardrobe Ledger - Supabase Schema
-- Run this in Supabase Dashboard > SQL Editor
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- items table ----------
create table if not exists items (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'Untitled',
  image_url text,
  storage_path text,
  category text not null default 'Top',
  subcategory text,
  color_primary text,
  color_secondary text,
  pattern text,
  material_guess text,
  weight text,
  formality int default 3,
  sleeve_length text,
  season_tags text[] default '{}',
  context_tags text[] default '{}',
  fit text,
  status text default 'Clean',
  confidence float default 0,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists items_category_idx on items(category);
create index if not exists items_status_idx on items(status);
create index if not exists items_created_at_idx on items(created_at desc);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_updated_at on items;
create trigger items_updated_at
  before update on items
  for each row execute function update_updated_at();

-- Single-user app: server-only access via service role key.
-- RLS stays disabled. The app password gate is the only access control.
alter table items disable row level security;

-- =========================================================
-- STORAGE BUCKET
-- =========================================================
-- Create the bucket via Supabase Dashboard:
--   Storage > New bucket
--   Name: wardrobe
--   Public: ON  (so image URLs work without signed URL hassle)
--   File size limit: 5MB
--   Allowed MIME types: image/*
--
-- No SQL policies needed - server uses service role key which bypasses RLS.
-- Public reads are fine because URLs contain unguessable UUIDs.
