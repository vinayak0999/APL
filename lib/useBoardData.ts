"use client";

import { useMemo } from "react";
import { useLiveData } from "./useLiveData";
import { computeStandings } from "./standings";
import type { Player, TeamStanding } from "./types";

// One hook every live-board variant uses: raw live data + common derived bits.
export function useBoardData() {
  const live = useLiveData();
  const { auction, players, teams } = live;

  const standings = useMemo(
    () => computeStandings(teams, players, auction),
    [teams, players, auction]
  );

  const current = players.find((p) => p.id === auction?.current_player_id) ?? null;
  const isOpen = auction?.lot_status === "open";
  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "—";

  const soldCount = players.filter((p) => p.status === "sold").length;
  const availCount = players.filter((p) => p.status === "available").length;
  const topBuy = players
    .filter((p) => p.status === "sold")
    .sort((a, b) => (b.sold_price ?? 0) - (a.sold_price ?? 0))[0] as Player | undefined;

  const rosterOf = (teamId: string) =>
    players
      .filter((p) => p.sold_team === teamId && p.status === "sold")
      .sort((a, b) => (b.sold_price ?? 0) - (a.sold_price ?? 0));

  const ranked: TeamStanding[] = standings.slice().sort((a, b) => b.spent - a.spent);

  return {
    ...live,
    standings,
    ranked,
    current,
    isOpen,
    teamName,
    soldCount,
    availCount,
    topBuy,
    rosterOf,
  };
}

export const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
