import type { Auction, Player, Team, TeamStanding } from "./types";

// Compute per-team standings from the raw tables (client-side so it stays
// in sync with realtime without needing a published DB view).
export function computeStandings(
  teams: Team[],
  players: Player[],
  auction: Auction | null
): TeamStanding[] {
  const budget = auction?.budget_per_team ?? 0;
  return teams.map((t) => {
    const won = players.filter((p) => p.sold_team === t.id && p.status === "sold");

    // Captain + vice-captain are RETAINED players: each costs their base price
    // against the purse and occupies a squad slot (skip any already counted as
    // a won/sold player to avoid double-charging).
    const cap = t.captain_id ? players.find((p) => p.id === t.captain_id) : undefined;
    const vc = t.vice_captain_id ? players.find((p) => p.id === t.vice_captain_id) : undefined;
    const retained = [cap, vc].filter(
      (p): p is Player => !!p && !won.some((w) => w.id === p.id)
    );

    const roster = [...won, ...retained];
    const spent =
      won.reduce((s, p) => s + (p.sold_price ?? 0), 0) +
      retained.reduce((s, p) => s + (p.base_price ?? 0), 0);
    const female = roster.filter((p) => p.gender === "F").length;
    return {
      id: t.id,
      name: t.name,
      pin: t.pin,
      logo_url: t.logo_url ?? null,
      captain_id: t.captain_id ?? null,
      vice_captain_id: t.vice_captain_id ?? null,
      spent,
      remaining: budget - spent,
      squad_count: roster.length,
      female_count: female,
      male_count: roster.length - female,
    };
  });
}

// How much a team can bid right now: simply its remaining purse. Squad size is
// a cap (enforced separately), not a mandatory fill, so no reserve is withheld.
export function maxBid(st: TeamStanding, auction: Auction): number {
  void auction;
  return st.remaining;
}
