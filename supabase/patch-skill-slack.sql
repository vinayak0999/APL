-- ============================================================
-- APL patch: per-player skill + skill level (for live board card)
-- Safe to run on a live DB — adds nullable columns, no data loss.
-- Run in: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

alter table players add column if not exists skill       text;
alter table players add column if not exists skill_level text;

-- Player photos are resolved live from Slack by name match, so no
-- avatar column is stored here.
