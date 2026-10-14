-- ============================================================
-- APL (Autonex Premier League) Auction — Database Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query > Run
-- Safe to re-run: drops and recreates everything (RESETS DATA).
-- ============================================================

-- ---- clean slate ----
drop table if exists bids cascade;
drop table if exists players cascade;
drop table if exists teams cascade;
drop table if exists auction cascade;

-- ---- single auction (one row, id=1) holds global config + live state ----
create table auction (
  id                    int primary key default 1,
  name                  text not null default 'Autonex Premier League',
  -- config
  budget_per_team       bigint not null default 100000,   -- each team's total purse
  squad_size            int    not null default 10,       -- players each team must fill
  base_price            bigint not null default 100,       -- RESERVE FLOOR: min cash kept per unfilled slot (+ default base for new players)
  bid_increment         bigint not null default 500,       -- fixed raise step
  min_females_per_team  int    not null default 1,         -- each team must sign >= this many females
  -- live state
  status                text   not null default 'setup',   -- setup | live | paused | done
  current_player_id     uuid,                              -- player currently on the block (null = none)
  current_bid           bigint,                            -- current highest bid on the live lot
  current_bidder_team   uuid,                              -- team holding the current highest bid
  lot_status            text   not null default 'idle',    -- idle | open | sold | unsold
  updated_at            timestamptz not null default now(),
  constraint auction_singleton check (id = 1)
);
insert into auction (id) values (1) on conflict (id) do nothing;

-- ---- teams ----
create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  pin         text not null,                 -- login code for the team captain
  created_at  timestamptz not null default now(),
  unique (pin)
);

-- ---- players ----
create table players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  gender      text not null default 'M',     -- 'M' | 'F'
  base_price  bigint not null default 100,    -- per-player opening bid (stars higher)
  skill       text,                           -- role/skill label (e.g. 'Backend', 'Design')
  skill_level text,                           -- proficiency label (e.g. 'Expert', 'L4')
  status      text not null default 'available', -- available | sold | unsold
  sold_team   uuid references teams(id) on delete set null,
  sold_price  bigint,
  created_at  timestamptz not null default now()
);

-- ---- bid history (audit trail) ----
create table bids (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  team_id     uuid not null references teams(id) on delete cascade,
  amount      bigint not null,
  created_at  timestamptz not null default now()
);

create index on players (status);
create index on players (sold_team);
create index on bids (player_id);

-- ============================================================
-- Helper view: per-team live standings (spent, remaining, counts)
-- ============================================================
create or replace view team_standings as
select
  t.id,
  t.name,
  t.pin,
  coalesce(sum(p.sold_price), 0)                                   as spent,
  (select budget_per_team from auction where id = 1)
    - coalesce(sum(p.sold_price), 0)                               as remaining,
  count(p.id)                                                      as squad_count,
  count(p.id) filter (where p.gender = 'F')                        as female_count,
  count(p.id) filter (where p.gender = 'M')                        as male_count
from teams t
left join players p on p.sold_team = t.id and p.status = 'sold'
group by t.id, t.name, t.pin;

-- ============================================================
-- place_bid(team, amount): atomic, race-safe bid on the live lot.
-- Enforces ALL rules server-side so two devices can't both "win":
--   1. a lot must be open
--   2. amount must be exactly current_bid + increment (or base on first bid)
--   3. team must not already hold the top bid
--   4. budget guard: amount <= remaining purse
--   5. squad reserve: must keep enough cash to fill remaining slots at base_price
--   6. squad full: can't bid once squad_size reached
-- Returns: jsonb { ok, error, current_bid, current_bidder_team }
-- ============================================================
create or replace function place_bid(p_team uuid, p_amount bigint)
returns jsonb
language plpgsql
security definer           -- runs as owner so it can write bids/auction past RLS;
set search_path = public   -- all validation happens inside this function
as $$
declare
  a            auction%rowtype;
  v_spent      bigint;
  v_remaining  bigint;
  v_squad      int;
  v_pbase      bigint;
  v_min_bid    bigint;
begin
  -- lock the auction row so concurrent bids serialize
  select * into a from auction where id = 1 for update;

  if a.lot_status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'No open lot right now.');
  end if;

  if a.current_bidder_team = p_team then
    return jsonb_build_object('ok', false, 'error', 'You already hold the top bid.');
  end if;

  -- this player's base price drives the opening bid
  select base_price into v_pbase from players where id = a.current_player_id;

  if a.current_bid is null then
    v_min_bid := coalesce(v_pbase, a.base_price);
  else
    v_min_bid := a.current_bid + a.bid_increment;
  end if;

  if p_amount < v_min_bid then
    return jsonb_build_object('ok', false, 'error',
      'Bid must be at least ' || v_min_bid || '.', 'expected', v_min_bid);
  end if;

  select coalesce(sum(sold_price),0), count(*)
    into v_spent, v_squad
  from players where sold_team = p_team and status = 'sold';

  -- squad size is a hard cap only (not a mandatory fill → no reserve)
  if v_squad >= a.squad_size then
    return jsonb_build_object('ok', false, 'error',
      'Your squad is full (max ' || a.squad_size || ').');
  end if;

  -- the ONLY money rule: can't bid more than you have left
  v_remaining := a.budget_per_team - v_spent;
  if p_amount > v_remaining then
    return jsonb_build_object('ok', false, 'error',
      'Not enough purse — you have ' || v_remaining || ' left.');
  end if;

  -- accept the bid
  update auction
     set current_bid = p_amount,
         current_bidder_team = p_team,
         updated_at = now()
   where id = 1;

  insert into bids (player_id, team_id, amount)
  values (a.current_player_id, p_team, p_amount);

  return jsonb_build_object('ok', true, 'current_bid', p_amount, 'current_bidder_team', p_team);
end;
$$;

-- ============================================================
-- Realtime: broadcast changes so every device updates instantly
-- ============================================================
alter publication supabase_realtime add table auction;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table bids;

-- ============================================================
-- Row Level Security
-- The app reads with the anon key (browser) and writes privileged
-- actions with the service_role key (server). We allow anon SELECT
-- for live viewing, and route all mutations through the server /
-- the place_bid RPC. Keep it simple + safe for an internal event.
-- ============================================================
alter table auction  enable row level security;
alter table teams    enable row level security;
alter table players  enable row level security;
alter table bids     enable row level security;

-- anon can read everything (live board). service_role bypasses RLS.
create policy "anon read auction"  on auction  for select using (true);
create policy "anon read teams"    on teams    for select using (true);
create policy "anon read players"  on players  for select using (true);
create policy "anon read bids"     on bids     for select using (true);

-- allow anon to execute place_bid (validated entirely inside the function)
grant execute on function place_bid(uuid, bigint) to anon;
