"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser client — uses the anon public key. Safe to ship to the client.
// Used for live reads + realtime subscriptions + the place_bid RPC.
//
// Created LAZILY via a Proxy: createClient only runs on first real use (inside
// client-side effects), never at module-evaluation time. That lets the /live and
// /team pages prerender during the build even when the env vars aren't present
// (e.g. a Vercel build before they're configured) without crashing.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  _client = createClient(url, anon, {
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client as object, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
