-- Sprint 3 Migration — Cost-per-wear price field
alter table items add column if not exists price numeric(10,2) default null;

-- items_with_wear view uses i.* so picks up price automatically — no view change needed.

-- Verification:
-- select id, name, price from items_with_wear limit 3;
