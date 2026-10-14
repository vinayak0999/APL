"use client";

import { useEffect, useRef, useState } from "react";
import type { Auction, Player } from "./types";

export interface SoldEvent {
  name: string;
  gender: string;
  team: string;
  price: number;
  key: number;
}

/**
 * Detects the moment a lot closes as SOLD (current_player_id goes id -> null
 * while that player is now status 'sold'). Returns the event for `ms`, then
 * clears it — used to trigger hammer-strike / SOLD overlays.
 */
export function useSoldEvent(
  auction: Auction | null,
  players: Player[],
  teamName: (id: string | null) => string,
  ms = 4200
): SoldEvent | null {
  const prevLotId = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sold, setSold] = useState<SoldEvent | null>(null);

  useEffect(() => {
    const nowId = auction?.current_player_id ?? null;
    const prev = prevLotId.current;
    if (prev && !nowId) {
      const p = players.find((x) => x.id === prev);
      if (p && p.status === "sold" && p.sold_team) {
        setSold({
          name: p.name,
          gender: p.gender,
          team: teamName(p.sold_team),
          price: p.sold_price ?? 0,
          key: Date.now(),
        });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setSold(null), ms);
      }
    }
    prevLotId.current = nowId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.current_player_id]);

  return sold;
}

/** Smoothly animates a number toward `target` (eased). Great for live bids. */
export function useCountUp(target: number, duration = 450): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setVal(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, duration]);

  return val;
}

/** Returns a key that changes whenever the lot changes — for transition anims. */
export function useLotKey(auction: Auction | null): string {
  return auction?.current_player_id ?? "idle";
}
