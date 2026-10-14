"use client";

import { useEffect, useState } from "react";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Fetches the Slack name->avatar map once (refreshes every 2 min) and
// returns a resolver. Falls back to null when Slack is off or no match.
export function usePlayerPhotos() {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/slack-avatars");
        const json = (await res.json()) as { map?: Record<string, string> };
        if (alive && json.map) setMap(json.map);
      } catch {
        /* ignore — keep initials */
      }
    };
    load();
    const t = setInterval(load, 120000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (name: string | null | undefined): string | null => {
    if (!name) return null;
    return map[norm(name)] ?? null;
  };
}
