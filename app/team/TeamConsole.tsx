"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase/client";
import { useLiveData } from "@/lib/useLiveData";
import { computeStandings, maxBid } from "@/lib/standings";
import { usePlayerPhotos } from "@/lib/usePlayerPhotos";
import { fmt } from "@/lib/format";
import { CricketBall, Trophy } from "@/components/CricketArt";
import type { Player } from "@/lib/types";

export default function TeamConsole({
  team,
  onLogout,
}: {
  team: { id: string; name: string; pin: string };
  onLogout: () => void;
}) {
  const { auction, players, teams, loading, connected } = useLiveData();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const [bidAmt, setBidAmt] = useState<string>("");

  const standings = useMemo(
    () => computeStandings(teams, players, auction),
    [teams, players, auction]
  );
  const me = standings.find((s) => s.id === team.id);
  const current = players.find((p) => p.id === auction?.current_player_id) ?? null;
  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "—";
  const photoOf = usePlayerPhotos();

  // my squad: retained captain/VC (shown first with a role badge) + won players
  const myRoster = useMemo(() => {
    const won = players.filter((p) => p.sold_team === team.id && p.status === "sold");
    const cap = me?.captain_id ? players.find((p) => p.id === me.captain_id) : undefined;
    const vc = me?.vice_captain_id ? players.find((p) => p.id === me.vice_captain_id) : undefined;
    const rows: { player: Player; role: "C" | "VC" | null; price: number }[] = [];
    if (cap) rows.push({ player: cap, role: "C", price: cap.base_price });
    if (vc && vc.id !== cap?.id) rows.push({ player: vc, role: "VC", price: vc.base_price });
    for (const p of won) {
      if (p.id === cap?.id || p.id === vc?.id) continue;
      rows.push({ player: p, role: null, price: p.sold_price ?? 0 });
    }
    return rows;
  }, [players, team.id, me?.captain_id, me?.vice_captain_id]);

  function flash(ok: boolean, m: string) {
    setMsg({ t: ok ? "ok" : "err", m });
    setTimeout(() => setMsg(null), 3000);
  }

  // clear the typed amount whenever the lot or current bid changes
  useEffect(() => {
    setBidAmt("");
  }, [auction?.current_player_id, auction?.current_bid]);

  if (loading || !auction || !me)
    return (
      <>
        <Header subtitle={team.name} />
        <main className="mx-auto max-w-2xl px-5 py-20 text-muted">
          {!me && !loading
            ? "This team no longer exists. Please log in again."
            : "Loading…"}
        </main>
      </>
    );

  const isOpen = auction.lot_status === "open";
  const iLead = auction.current_bidder_team === team.id;
  const minBid =
    auction.current_bid == null
      ? current?.base_price ?? auction.base_price
      : auction.current_bid + auction.bid_increment;
  const budgetCap = maxBid(me, auction);
  const squadFull = me.squad_count >= auction.squad_size;

  // amount the captain will bid: typed value, or the minimum if left blank
  const effBid = bidAmt === "" ? minBid : Math.floor(Number(bidAmt) || 0);
  const amtTooLow = effBid < minBid;
  const amtTooHigh = effBid > budgetCap;

  // structural blocks (can't bid at all on this lot)
  let blockReason = "";
  if (!isOpen) blockReason = "Waiting for the next lot…";
  else if (iLead) blockReason = "You hold the top bid.";
  else if (squadFull) blockReason = `Your squad is full (max ${auction.squad_size}).`;
  else if (minBid > budgetCap) blockReason = "Not enough purse for this player's base price.";

  const canBid = isOpen && !iLead && !blockReason && !amtTooLow && !amtTooHigh;

  async function raise() {
    setBusy(true);
    const { data, error } = await supabase.rpc("place_bid", {
      p_team: team.id,
      p_amount: effBid,
    });
    setBusy(false);
    if (error) return flash(false, error.message);
    const r = data as { ok: boolean; error?: string };
    if (!r.ok) return flash(false, r.error ?? "Bid rejected.");
    setBidAmt("");
    flash(true, `Bid placed: ${fmt(effBid)}`);
  }

  return (
    <>
      <Header
        subtitle={team.name}
        right={
          <>
            <span className={"pill " + (connected ? "bg-blue-50 text-navy" : "bg-amber-50 text-warning")}>
              <span className={"h-2 w-2 rounded-full " + (connected ? "bg-success" : "bg-warning")} />
              {connected ? "Live" : "Connecting"}
            </span>
            <button className="btn btn-ghost" onClick={onLogout}>Exit</button>
          </>
        }
      />

      {/* my purse strip */}
      <div className="bg-navy text-white">
        <div className="mx-auto max-w-3xl px-5 py-4 grid grid-cols-4 gap-2 text-center">
          <PurseStat label="Purse left" value={fmt(me.remaining)} big />
          <PurseStat label="Squad" value={`${me.squad_count}/${auction.squad_size}`} />
          <PurseStat label="Females" value={`${me.female_count}/${auction.min_females_per_team}`} warn={me.female_count < auction.min_females_per_team} />
          <PurseStat label="Spent" value={fmt(me.spent)} />
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-5 py-6 space-y-5">
        {msg && (
          <div className={"rounded-lg px-4 py-2 text-sm font-medium " + (msg.t === "ok" ? "bg-blue-50 text-navy" : "bg-red-50 text-danger")}>
            {msg.m}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_340px] items-start">
        {/* live lot */}
        <div className="card p-7 text-center animate-pop">
          {current && isOpen ? (
            <>
              <PlayerPhoto player={current} src={photoOf(current.name)} />
              <span className={"pill mt-4 " + (current.gender === "F" ? "bg-pink-50 text-pink-700" : "bg-blue-50 text-navy")}>
                {current.gender === "F" ? "Female" : "Male"}
              </span>
              <div className="text-4xl font-extrabold text-navy mt-3">{current.name}</div>

              <div className="mt-6 inline-flex flex-col">
                <span className="text-xs uppercase tracking-wide text-muted">
                  {auction.current_bid == null ? "Base price" : "Current bid"}
                </span>
                <span className="text-5xl font-extrabold text-blue">
                  {fmt(auction.current_bid ?? current.base_price)}
                </span>
                <span className="text-sm text-muted mt-1">
                  {auction.current_bidder_team
                    ? iLead ? "🟢 You lead" : "by " + teamName(auction.current_bidder_team)
                    : "No bids yet"}
                </span>
              </div>

              <div className="mt-7 max-w-sm mx-auto">
                {!blockReason && (
                  <>
                    {/* quick +increment chips */}
                    <div className="flex gap-2 justify-center mb-3">
                      {[0, 1, 2, 5].map((k) => {
                        const v = minBid + k * auction.bid_increment;
                        if (v > budgetCap) return null;
                        return (
                          <button
                            key={k}
                            onClick={() => setBidAmt(String(v))}
                            className={
                              "btn text-sm " + (effBid === v ? "btn-navy" : "btn-ghost")
                            }
                          >
                            {fmt(v)}
                          </button>
                        );
                      })}
                    </div>
                    {/* custom amount */}
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="input text-center text-lg font-bold"
                        value={bidAmt}
                        min={minBid}
                        max={budgetCap}
                        step={auction.bid_increment}
                        placeholder={String(minBid)}
                        onChange={(e) => setBidAmt(e.target.value)}
                      />
                      <button
                        onClick={raise}
                        disabled={!canBid || busy}
                        className="btn btn-primary text-lg px-6 whitespace-nowrap"
                      >
                        {busy ? "…" : "RAISE"}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      Min {fmt(minBid)} · your cap {fmt(budgetCap)}
                      {amtTooHigh && <span className="text-danger font-semibold"> · above your cap</span>}
                      {amtTooLow && <span className="text-danger font-semibold"> · below minimum</span>}
                    </p>
                  </>
                )}
                {blockReason && <p className="mt-3 text-sm text-muted">{blockReason}</p>}
              </div>
            </>
          ) : (
            <div className="py-10">
              <div className="mx-auto h-20 w-20 mb-4">
                {auction.status === "done" ? (
                  <Trophy className="h-full w-full" />
                ) : (
                  <CricketBall className="h-full w-full animate-spin [animation-duration:6s]" />
                )}
              </div>
              <div className="text-2xl font-bold text-navy">No lot on the block</div>
              <p className="text-muted mt-2">
                {auction.status === "done"
                  ? "The auction has ended."
                  : "Waiting for the admin to put the next player up…"}
              </p>
            </div>
          )}
        </div>

        {/* MY TEAM roster */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
            {me.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.logo_url} alt={me.name} className="h-11 w-11 rounded-full object-cover ring-1 ring-black/10" />
            ) : (
              <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 font-extrabold text-navy ring-1 ring-blue-100">
                {me.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-navy leading-tight">{me.name}</div>
              <div className="text-xs text-muted">
                Squad {myRoster.length}/{auction.squad_size} · {fmt(me.remaining)} left
              </div>
            </div>
          </div>
          {myRoster.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">No players yet — win a bid to build your squad.</p>
          ) : (
            <div className="space-y-2">
              {myRoster.map(({ player, role, price }) => (
                <div key={player.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <PlayerPhoto player={player} src={photoOf(player.name)} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-navy">{player.name}</span>
                      {role && (
                        <span className={"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold " + (role === "C" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700")}>
                          {role}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">{role ? "Retained" : "Won"} · {fmt(price)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>

        {/* standings */}
        <div className="card p-5">
          <h3 className="font-bold text-navy mb-3">Standings</h3>
          <div className="space-y-2">
            {standings
              .slice()
              .sort((a, b) => b.spent - a.spent)
              .map((t) => (
                <div
                  key={t.id}
                  className={
                    "flex items-center justify-between text-sm rounded-lg px-3 py-2 " +
                    (t.id === team.id ? "bg-blue-50" : "")
                  }
                >
                  <span className="font-semibold text-navy">
                    {t.name} {t.id === team.id && <span className="text-blue">(you)</span>}
                  </span>
                  <span className="text-muted">
                    {t.squad_count}/{auction.squad_size} · {t.female_count}♀ · {fmt(t.remaining)} left
                  </span>
                </div>
              ))}
          </div>
        </div>
      </main>
    </>
  );
}

function PlayerPhoto({
  player,
  src,
  size = 132,
}: {
  player: Player;
  src: string | null;
  size?: number;
}) {
  const inits = player.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className="mx-auto overflow-hidden rounded-full bg-blue-50 ring-2 ring-blue-100 grid place-items-center"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={player.name} className="h-full w-full object-cover" />
      ) : (
        <span className="font-extrabold text-navy" style={{ fontSize: size * 0.34 }}>
          {inits}
        </span>
      )}
    </div>
  );
}

function PurseStat({
  label,
  value,
  big,
  warn,
}: {
  label: string;
  value: string;
  big?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <div className={(big ? "text-2xl" : "text-lg") + " font-extrabold " + (warn ? "text-amber-300" : "text-white")}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-white/60">{label}</div>
    </div>
  );
}
