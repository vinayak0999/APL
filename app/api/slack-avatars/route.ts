import { NextResponse } from "next/server";
import { slackAvatarMap } from "@/lib/slack";

// Public (read-only) endpoint the live board polls to map player names to
// Slack photos. Returns { enabled, map }. The roster is cached in-memory
// (see lib/slack.ts TTL) so repeated polls don't hammer Slack.
export async function GET() {
  const map = await slackAvatarMap();
  return NextResponse.json(
    { enabled: !!process.env.SLACK_BOT_TOKEN, map },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } }
  );
}
