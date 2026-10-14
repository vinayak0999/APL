import "server-only";

import { createClient } from "@supabase/supabase-js";

// Server-only client — uses the service_role key. BYPASSES row-level
// security. Never import this into a client component.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createAdminClient() {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
