"use server";

import { createAdminClient } from "@/lib/supabase/server";

// Verify a team PIN without exposing the whole teams table to the browser.
// Returns the team id + name on success.
export async function teamLogin(pin: string): Promise<{
  ok: boolean;
  error?: string;
  team?: { id: string; name: string; pin: string };
}> {
  const clean = pin.trim().toUpperCase();
  if (!clean) return { ok: false, error: "Enter your team PIN." };
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("teams")
    .select("id, name, pin")
    .eq("pin", clean)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No team found for that PIN." };
  return { ok: true, team: data };
}
