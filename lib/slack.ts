import "server-only";

// Resolves player photos from a Slack workspace by NAME match.
// Needs SLACK_BOT_TOKEN (bot scope: users:read). If unset or the call
// fails, returns an empty map and the board falls back to initials.

const TOKEN = process.env.SLACK_BOT_TOKEN;
const TTL_MS = 5 * 60 * 1000; // cache the workspace roster for 5 minutes

type SlackUser = {
  deleted?: boolean;
  is_bot?: boolean;
  real_name?: string;
  name?: string;
  profile?: {
    real_name?: string;
    display_name?: string;
    display_name_normalized?: string;
    real_name_normalized?: string;
    image_512?: string;
    image_192?: string;
    image_72?: string;
  };
};

// normalize a name to a match key: lowercase alphanumerics only
export function nameKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

let cache: { at: number; map: Record<string, string> } | null = null;

function avatarOf(u: SlackUser): string | undefined {
  const p = u.profile ?? {};
  return p.image_512 || p.image_192 || p.image_72;
}

async function fetchRoster(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  if (!TOKEN) return map;

  let cursor = "";
  // paginate users.list (Slack caps ~200/page)
  for (let i = 0; i < 20; i++) {
    const url = new URL("https://slack.com/api/users.list");
    url.searchParams.set("limit", "200");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const json = (await res.json()) as {
      ok: boolean;
      members?: SlackUser[];
      response_metadata?: { next_cursor?: string };
    };
    if (!json.ok || !json.members) break;

    for (const u of json.members) {
      if (u.deleted || u.is_bot) continue;
      const img = avatarOf(u);
      if (!img) continue;
      // index every name variant Slack exposes so name-match is forgiving
      const names = [
        u.real_name,
        u.name,
        u.profile?.real_name,
        u.profile?.display_name,
        u.profile?.display_name_normalized,
        u.profile?.real_name_normalized,
      ];
      for (const n of names) {
        const k = n && nameKey(n);
        if (k && !map[k]) map[k] = img;
      }
    }
    cursor = json.response_metadata?.next_cursor ?? "";
    if (!cursor) break;
  }
  return map;
}

// Returns a { normalizedName -> avatarUrl } map, cached in memory.
export async function slackAvatarMap(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  try {
    const map = await fetchRoster();
    cache = { at: Date.now(), map };
    return map;
  } catch {
    return cache?.map ?? {};
  }
}
