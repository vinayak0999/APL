"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase/client";
import type { Auction, Player, Team } from "./types";

export interface BidFeedItem {
  id: string;
  amount: number;
  created_at: string;
  team_id: string;
  player_id: string;
  team: { name: string } | null;
  player: { name: string; gender: string } | null;
}

export interface LiveData {
  auction: Auction | null;
  players: Player[];
  teams: Team[];
  bids: BidFeedItem[];
  loading: boolean;
  connected: boolean;
  refetch: () => void;
}

// Subscribes to realtime changes on auction/players/teams/bids and keeps a
// fresh snapshot in React state. Any change triggers a (debounced) refetch so
// every device shows the same thing within a moment.
export function useLiveData(): LiveData {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [bids, setBids] = useState<BidFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    const [a, p, t, b] = await Promise.all([
      supabase.from("auction").select("*").eq("id", 1).single(),
      supabase.from("players").select("*").order("created_at", { ascending: true }),
      supabase.from("teams").select("*").order("created_at", { ascending: true }),
      supabase
        .from("bids")
        .select("id,amount,created_at,team_id,player_id,team:teams(name),player:players(name,gender)")
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
    if (a.data) setAuction(a.data as Auction);
    if (p.data) setPlayers(p.data as Player[]);
    if (t.data) setTeams(t.data as Team[]);
    if (b.data) setBids(b.data as unknown as BidFeedItem[]);
    setLoading(false);
  }, []);

  const debouncedFetch = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fetchAll, 120);
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("apl-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "auction" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, debouncedFetch)
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    // safety net: poll every 5s in case a realtime event is missed
    const poll = setInterval(fetchAll, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fetchAll, debouncedFetch]);

  return { auction, players, teams, bids, loading, connected, refetch: fetchAll };
}
