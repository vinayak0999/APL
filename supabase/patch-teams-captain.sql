-- ============================================================
-- APL patch: player skill cols + team logo / captain / vice-captain
-- Safe to run on a live DB — all columns nullable, no data loss.
-- Run in: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- players: skill + level (needed by Excel import and live card)
alter table players add column if not exists skill       text;
alter table players add column if not exists skill_level text;

-- teams: logo URL + captain / vice-captain (shown on live dashboard)
alter table teams add column if not exists logo_url        text;
alter table teams add column if not exists captain_id      uuid references players(id) on delete set null;
alter table teams add column if not exists vice_captain_id uuid references players(id) on delete set null;
