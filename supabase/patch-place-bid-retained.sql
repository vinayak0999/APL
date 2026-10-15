-- PATCH v6: purse bidding + RETAINED captain/VC + SQUAD RESERVE cap.
--   * each team's captain + vice-captain cost their base_price against the purse
--     and each occupy one squad slot (count toward the squad-size cap)
--   * a team must keep back enough purse to buy its remaining squad slots at
--     base price — so it can't overspend on one player and leave slots unfillable
--   * max bid = (purse left) - (slots left after this win) * base_price
-- Safe to run anytime — does NOT delete teams/players/sales. Idempotent.
-- Run in: Supabase Dashboard > SQL Editor > New query > Run.

create or replace function place_bid(p_team uuid, p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a            auction%rowtype;
  v_spent      bigint;
  v_squad      int;
  v_pbase      bigint;
  v_min_bid    bigint;
  v_cap_spent  bigint;
  v_cap_count  int;
  v_cap_id     uuid;
  v_vc_id      uuid;
  v_slots_left int;
  v_reserve    bigint;
  v_maxbid     bigint;
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

  -- money + slots already committed via the auction (sold players)
  select coalesce(sum(sold_price),0), count(*)
    into v_spent, v_squad
  from players where sold_team = p_team and status = 'sold';

  -- RETAINED captain + vice-captain: add their base price + a slot each,
  -- skipping any that somehow also appear as a sold player for this team.
  select captain_id, vice_captain_id into v_cap_id, v_vc_id
  from teams where id = p_team;

  select
    coalesce(sum(base_price), 0),
    count(*)
  into v_cap_spent, v_cap_count
  from players
  where id in (v_cap_id, v_vc_id)
    and not (sold_team = p_team and status = 'sold');

  v_spent := v_spent + v_cap_spent;
  v_squad := v_squad + v_cap_count;

  -- squad size is a hard cap only
  if v_squad >= a.squad_size then
    return jsonb_build_object('ok', false, 'error',
      'Your squad is full (max ' || a.squad_size || ').');
  end if;

  -- squad reserve: keep enough purse to buy the remaining slots at base price.
  -- after winning THIS player, slots left to fill = squad_size - v_squad - 1.
  v_slots_left := a.squad_size - v_squad - 1;
  if v_slots_left < 0 then v_slots_left := 0; end if;
  v_reserve := v_slots_left * a.base_price;
  v_maxbid  := (a.budget_per_team - v_spent) - v_reserve;

  if p_amount > v_maxbid then
    return jsonb_build_object('ok', false, 'error',
      'Over your cap — max bid is ' || v_maxbid ||
      ' (reserve ' || v_reserve || ' for ' || v_slots_left || ' more slots).',
      'expected', v_maxbid);
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
