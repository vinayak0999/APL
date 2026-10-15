"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import {
  isAdmin,
  setAdminCookie,
  clearAdminCookie,
  checkAdminPassword,
} from "@/lib/auth";
import type { AuctionStatus, Gender } from "@/lib/types";

type Result = { ok: boolean; error?: string };

async function guard(): Promise<Result | null> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  return null;
}

function touch() {
  revalidatePath("/admin");
  revalidatePath("/live");
  revalidatePath("/team");
}

// ---------------- auth ----------------
export async function adminLogin(pw: string): Promise<Result> {
  if (!checkAdminPassword(pw)) return { ok: false, error: "Wrong password." };
  await setAdminCookie();
  return { ok: true };
}

export async function adminLogout(): Promise<Result> {
  await clearAdminCookie();
  return { ok: true };
}

// ---------------- config ----------------
export async function updateConfig(cfg: {
  name: string;
  budget_per_team: number;
  squad_size: number;
  base_price: number;
  bid_increment: number;
  min_females_per_team: number;
}): Promise<Result> {
  const g = await guard();
  if (g) return g;

  if (cfg.squad_size < 1) return { ok: false, error: "Squad size must be >= 1." };
  if (cfg.base_price < 0 || cfg.budget_per_team < 0)
    return { ok: false, error: "Amounts must be positive." };
  if (cfg.bid_increment < 1) return { ok: false, error: "Increment must be >= 1." };

  const sb = createAdminClient();

  const { error } = await sb.from("auction").update(cfg).eq("id", 1);
  if (error) return { ok: false, error: error.message };

  // Setup base price is the single source of truth: every Save pushes it to
  // all players so their base (= opening bid) always matches the config.
  const { error: pErr } = await sb
    .from("players")
    .update({ base_price: cfg.base_price })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (pErr) return { ok: false, error: pErr.message };

  touch();
  return { ok: true };
}

// ---------------- players ----------------
export async function addPlayers(
  rows: { name: string; gender: Gender; base_price?: number; skill?: string; skill_level?: string }[]
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const sb = createAdminClient();
  // default any missing base price to the auction's floor
  const { data: a } = await sb.from("auction").select("base_price").eq("id", 1).single();
  const floor = a?.base_price ?? 100;
  const clean = rows
    .filter((r) => r.name?.trim())
    .map((r) => ({
      name: r.name.trim(),
      gender: (r.gender === "F" ? "F" : "M") as Gender,
      base_price: r.base_price && r.base_price > 0 ? Math.floor(r.base_price) : floor,
      skill: r.skill?.trim() || null,
      skill_level: r.skill_level?.trim() || null,
    }));
  if (clean.length === 0) return { ok: false, error: "No valid rows found." };
  const { error } = await sb.from("players").insert(clean);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

export async function addPlayer(
  name: string,
  gender: Gender,
  base_price?: number
): Promise<Result> {
  return addPlayers([{ name, gender, base_price }]);
}

export async function updatePlayerBase(id: string, base_price: number): Promise<Result> {
  const g = await guard();
  if (g) return g;
  if (base_price < 0) return { ok: false, error: "Base price must be positive." };
  const sb = createAdminClient();
  const { error } = await sb
    .from("players")
    .update({ base_price: Math.floor(base_price) })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

export async function deletePlayer(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const sb = createAdminClient();
  const { error } = await sb.from("players").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

export async function clearAllPlayers(): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const sb = createAdminClient();
  const { error } = await sb
    .from("players")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

// ---------------- teams ----------------
export async function addTeam(
  name: string,
  pin: string,
  logo_url?: string
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  if (!name.trim()) return { ok: false, error: "Team name required." };
  if (!/^\w{3,10}$/.test(pin))
    return { ok: false, error: "PIN must be 3–10 letters/digits." };
  const sb = createAdminClient();
  const { error } = await sb
    .from("teams")
    .insert({ name: name.trim(), pin: pin.toUpperCase(), logo_url: logo_url?.trim() || null });
  if (error)
    return {
      ok: false,
      error: error.code === "23505" ? "That PIN is already in use." : error.message,
    };
  touch();
  return { ok: true };
}

// Set a team's logo and/or captain + vice-captain. Only the keys present in
// `meta` are written, so partial updates are safe.
export async function setTeamMeta(
  id: string,
  meta: { logo_url?: string | null; captain_id?: string | null; vice_captain_id?: string | null }
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  if (
    meta.captain_id &&
    meta.vice_captain_id &&
    meta.captain_id === meta.vice_captain_id
  )
    return { ok: false, error: "Captain and vice-captain must differ." };
  const patch: Record<string, unknown> = {};
  if ("logo_url" in meta) patch.logo_url = meta.logo_url?.trim() || null;
  if ("captain_id" in meta) patch.captain_id = meta.captain_id || null;
  if ("vice_captain_id" in meta) patch.vice_captain_id = meta.vice_captain_id || null;
  if (Object.keys(patch).length === 0) return { ok: true };
  const sb = createAdminClient();
  const { error } = await sb.from("teams").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

export async function updateTeam(
  id: string,
  name: string,
  pin: string
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  if (!/^\w{3,10}$/.test(pin))
    return { ok: false, error: "PIN must be 3–10 letters/digits." };
  const sb = createAdminClient();
  const { error } = await sb
    .from("teams")
    .update({ name: name.trim(), pin: pin.toUpperCase() })
    .eq("id", id);
  if (error)
    return {
      ok: false,
      error: error.code === "23505" ? "That PIN is already in use." : error.message,
    };
  touch();
  return { ok: true };
}

export async function deleteTeam(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const sb = createAdminClient();
  // free any players this team had won
  await sb
    .from("players")
    .update({ sold_team: null, sold_price: null, status: "available" })
    .eq("sold_team", id);
  const { error } = await sb.from("teams").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

// ---------------- running the auction ----------------
export async function setAuctionStatus(status: AuctionStatus): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const sb = createAdminClient();
  const { error } = await sb.from("auction").update({ status }).eq("id", 1);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

export async function openLot(playerId: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const sb = createAdminClient();

  // only available players can go on the block
  const { data: player } = await sb
    .from("players")
    .select("status")
    .eq("id", playerId)
    .single();
  if (!player) return { ok: false, error: "Player not found." };
  if (player.status === "sold")
    return { ok: false, error: "That player is already sold." };

  // retained captains / vice-captains are not auctioned
  const { data: retained } = await sb
    .from("teams")
    .select("id")
    .or(`captain_id.eq.${playerId},vice_captain_id.eq.${playerId}`)
    .limit(1);
  if (retained && retained.length > 0)
    return { ok: false, error: "That player is a retained captain/vice-captain." };

  const { error } = await sb
    .from("auction")
    .update({
      status: "live",
      current_player_id: playerId,
      current_bid: null,
      current_bidder_team: null,
      lot_status: "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

export async function closeLotSold(): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const sb = createAdminClient();

  const { data: a } = await sb.from("auction").select("*").eq("id", 1).single();
  if (!a || a.lot_status !== "open")
    return { ok: false, error: "No open lot." };
  if (!a.current_bidder_team || a.current_bid == null)
    return { ok: false, error: "No bids yet — mark Unsold instead." };

  const { error: pErr } = await sb
    .from("players")
    .update({
      status: "sold",
      sold_team: a.current_bidder_team,
      sold_price: a.current_bid,
    })
    .eq("id", a.current_player_id);
  if (pErr) return { ok: false, error: pErr.message };

  const { error } = await sb
    .from("auction")
    .update({
      current_player_id: null,
      current_bid: null,
      current_bidder_team: null,
      lot_status: "idle",
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

export async function closeLotUnsold(): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const sb = createAdminClient();

  const { data: a } = await sb.from("auction").select("*").eq("id", 1).single();
  if (!a || a.lot_status !== "open")
    return { ok: false, error: "No open lot." };

  if (a.current_player_id) {
    await sb
      .from("players")
      .update({ status: "unsold" })
      .eq("id", a.current_player_id);
  }
  const { error } = await sb
    .from("auction")
    .update({
      current_player_id: null,
      current_bid: null,
      current_bidder_team: null,
      lot_status: "idle",
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

// Auto-close a lot whose 4-minute timer has expired. PUBLIC (no guard) so the
// live board can fire it — but it re-validates server-side that the lot is
// genuinely open AND past the 4-min window, and is idempotent: the first caller
// closes the lot, any racing callers find it already idle and no-op. If there's
// a bid → player SOLD to the top bidder; otherwise → UNSOLD.
const LOT_MS = 240_000;

export async function autoCloseLot(): Promise<Result> {
  const sb = createAdminClient();
  const { data: a } = await sb.from("auction").select("*").eq("id", 1).single();
  if (!a || a.lot_status !== "open") return { ok: true }; // already closed — no-op
  if (!a.current_player_id) return { ok: true };

  // guard: only close if the timer has actually elapsed
  const elapsed = Date.now() - new Date(a.updated_at).getTime();
  if (elapsed < LOT_MS) return { ok: false, error: "Timer still running." };

  if (a.current_bidder_team && a.current_bid != null) {
    const { error: pErr } = await sb
      .from("players")
      .update({ status: "sold", sold_team: a.current_bidder_team, sold_price: a.current_bid })
      .eq("id", a.current_player_id);
    if (pErr) return { ok: false, error: pErr.message };
  } else {
    await sb.from("players").update({ status: "unsold" }).eq("id", a.current_player_id);
  }

  const { error } = await sb
    .from("auction")
    .update({
      current_player_id: null,
      current_bid: null,
      current_bidder_team: null,
      lot_status: "idle",
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

// put an unsold player back into the available pool
export async function reopenPlayer(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const sb = createAdminClient();
  const { error } = await sb
    .from("players")
    .update({ status: "available", sold_team: null, sold_price: null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}

export async function resetAuction(): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const sb = createAdminClient();
  await sb
    .from("players")
    .update({ status: "available", sold_team: null, sold_price: null })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await sb
    .from("bids")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  const { error } = await sb
    .from("auction")
    .update({
      status: "setup",
      current_player_id: null,
      current_bid: null,
      current_bidder_team: null,
      lot_status: "idle",
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  touch();
  return { ok: true };
}
