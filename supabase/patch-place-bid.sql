-- PATCH v4 (FINAL): simple purse-only bidding.
--   * squad size is a CAP, not mandatory — no cash reserved for empty slots
--   * a bid is limited ONLY by the team's remaining purse
--   * female minimum is a target/warning (not a hard block)
-- Safe to run anytime — does NOT delete teams/players/sales.
-- Run in: Supabase Dashboard > SQL Editor > New query > Run.

-- per-player base price column (idempotent)
alter table players add column if not exists base_price bigint not null default 100;
update players
   set base_price = (select base_price from auction where id = 1)
 where base_price is null or base_price = 0;

create or replace function place_bid(p_team uuid, p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a            auction%rowtype;
  v_spent      bigint;
  v_remaining  bigint;
  v_squad      int;
  v_pbase      bigint;
  v_min_bid    bigint;
begin
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

  -- squad size is a hard cap only
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

grant execute on function place_bid(uuid, bigint) to anon;
