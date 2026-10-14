"use client";

import { createClient } from "@supabase/supabase-js";

// Browser client — uses the anon public key. Safe to ship to the client.
// Used for live reads + realtime subscriptions + the place_bid RPC.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  realtime: { params: { eventsPerSecond: 20 } },
});
