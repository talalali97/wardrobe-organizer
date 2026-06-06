-- Sprint 4 Migration — Outfit Library + Capsules

-- ---------- 1. outfits table ----------
create table if not exists outfits (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  item_ids uuid[] not null default '{}',
  occasion text default null,
  notes text default '',
  wear_count int default 0,
  last_worn timestamptz default null,
  created_at timestamptz default now()
);

create index if not exists outfits_created_at_idx on outfits(created_at desc);
alter table outfits disable row level security;

-- ---------- 2. capsules table ----------
create table if not exists capsules (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text default '',
  item_ids uuid[] not null default '{}',
  occasion text default null,
  created_at timestamptz default now()
);

create index if not exists capsules_created_at_idx on capsules(created_at desc);
alter table capsules disable row level security;

-- ---------- 3. log_outfit_wear RPC ----------
create or replace function log_outfit_wear(p_outfit_id uuid)
returns void language plpgsql as $$
declare
  v_item_ids uuid[];
begin
  select item_ids into v_item_ids from outfits where id = p_outfit_id;
  if v_item_ids is null then return; end if;

  insert into wear_log (item_id)
  select unnest(v_item_ids);

  update items set status = 'Dirty'
  where id = any(v_item_ids);

  update outfits
  set wear_count = wear_count + 1, last_worn = now()
  where id = p_outfit_id;
end;
$$;

-- Verification:
-- select count(*) from outfits;
-- select count(*) from capsules;
-- select log_outfit_wear('00000000-0000-0000-0000-000000000000'); -- expect no error
