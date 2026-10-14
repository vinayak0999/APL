# APL — Autonex Premier League Auction

Internal live-auction platform. Admin uploads players (Name + Gender), creates
teams with budgets, and runs a real-time bidding auction. Each team captain joins
on their own device with a PIN and raises bids live. The system guarantees:

- **Budget safety** — a team can never bid more than its purse, and always keeps
  enough reserve to fill its remaining squad slots at base price.
- **Fair female distribution** — admin sets a minimum number of female players per
  team; the system blocks a team from filling all its slots with males until that
  minimum can still be met.
- **Real-time sync** — every device (admin, teams, big-screen board) updates
  instantly via Supabase realtime, with a 5-second poll as a safety net.

Stack: Next.js (App Router) + Supabase (Postgres + Realtime). Deploy on Vercel.

---

## 1. Supabase setup (one time)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and
   **Run**. This creates all tables, the `place_bid` function, realtime, and
   row-level security. (Re-running it RESETS all data.)
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
   - **service_role** key (secret)

## 2. Environment variables

Edit **`.env.local`** (already created, git-ignored) and fill the two keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://hslleeeictlekyfdxpbg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste anon public key>
SUPABASE_SERVICE_ROLE_KEY=<paste service_role key>
ADMIN_PASSWORD=<choose an admin password>
```

> ⚠ The DB password you pasted earlier lives in `.env.local` as `DATABASE_URL`.
> It is git-ignored, but since it was shared in chat you should **rotate it** in
> Supabase (Settings → Database → Reset database password) after setup.

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

- **/admin** — admin console (sign in with `ADMIN_PASSWORD`)
- **/team** — team captains join with their PIN
- **/live** — big-screen live board

## 4. Deploy (Vercel)

1. Push this folder to a Git repo.
2. Import it in Vercel.
3. Add the same 4 env vars (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`)
   in Vercel → Project → Settings → Environment Variables.
4. Deploy. Share the `/team` URL with captains and open `/live` on the big screen.

---

## How to run an auction (admin)

1. **Setup tab** — set budget per team, squad size, base price, bid increment,
   and minimum females per team. Save.
2. **Players tab** — upload the Excel (`.xlsx`/`.csv`) with **Name** and
   **Gender** columns, or add players manually.
3. **Teams tab** — create each team and give its captain the PIN.
4. **Run Auction tab** — put a player on the block, let teams bid, then **Mark
   SOLD** (goes to the top bidder) or **Mark unsold**. Repeat. Export results to
   Excel at the end; **Reset auction** to start over (keeps teams + players).

## The bidding rules (enforced server-side in `place_bid`)

Every bid runs through a single atomic Postgres function that locks the auction
row, so two devices can never both "win" the same raise. A bid is accepted only
if: a lot is open, the amount is exactly the next increment, the bidder isn't
already leading, the squad isn't full, enough purse remains after reserving base
price for the other open slots, and (for male players) enough slots remain to
still meet the female minimum.

## Security notes (internal event)

- Team login is a shared PIN — fine for a trusted internal event. Anyone with a
  team's PIN can bid as that team. Don't post PINs publicly.
- Admin actions require the admin password (httpOnly cookie, 12h).
- All bid validation is server-side; the browser cannot bypass the budget or
  female rules.
