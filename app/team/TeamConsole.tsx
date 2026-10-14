"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase/client";
import { useLiveData } from "@/lib/useLiveData";
import { computeStandings, maxBid } from "@/lib/standings";
import { fmt } from "@/lib/format";
import { CricketBall, Trophy } from "@/components/CricketArt";

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

      <main className="mx-auto max-w-3xl px-5 py-6 space-y-5">
        {msg && (
          <div className={"rounded-lg px-4 py-2 text-sm font-medium " + (msg.t === "ok" ? "bg-blue-50 text-navy" : "bg-red-50 text-danger")}>
            {msg.m}
          </div>
        )}

        {/* live lot */}
        <div className="card p-7 text-center animate-pop">
          {current && isOpen ? (
            <>
              <span className={"pill " + (current.gender === "F" ? "bg-pink-50 text-pink-700" : "bg-blue-50 text-navy")}>
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
