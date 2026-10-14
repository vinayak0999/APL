"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useBoardData, initials } from "@/lib/useBoardData";
import { useSoldEvent, useCountUp } from "@/lib/useLiveExtras";
import { usePlayerPhotos } from "@/lib/usePlayerPhotos";
import { fmt } from "@/lib/format";
import Gavel from "@/components/Gavel";
import type { Player } from "@/lib/types";

// ===== Light broadcast palette — white cards on a bright stadium =====
const CYAN = "#22d3ee";

// Deterministic team color from the team name (no logo/color column exists).
function teamHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export default function LiveBoard() {
  const b = useBoardData();
  const {
    auction,
    current,
    isOpen,
    teamName,
    teams,
    ranked,
    soldCount,
    availCount,
    loading,
    rosterOf,
  } = b;
  const sold = useSoldEvent(auction, b.players, teamName);
  const bid = useCountUp(auction?.current_bid ?? current?.base_price ?? 0);
  const photoOf = usePlayerPhotos();

  // HIGHEST BIDDERS (individuals): every sold player ranked by winning bid, high→low.
  const topBidders = useMemo(
    () =>
      b.players
        .filter((p) => p.status === "sold")
        .sort((a, c) => (c.sold_price ?? 0) - (a.sold_price ?? 0)),
    [b.players]
  );

  const budget = auction?.budget_per_team ?? 0;
  const squadSize = auction?.squad_size ?? 0;
  const headerBase = current?.base_price ?? auction?.base_price ?? 0;

  const lotNo = useMemo(
    () => (current ? b.players.findIndex((p) => p.id === current.id) + 1 : 0),
    [b.players, current]
  );

  const nextMin =
    auction?.current_bid == null
      ? current?.base_price ?? auction?.base_price ?? 0
      : auction.current_bid + (auction.bid_increment ?? 0);

  const status = auction?.status ?? "setup";

  // chips under the player name — derived from real skill (comma-split) + level.
  const chips = useMemo(() => {
    const parts = (current?.skill ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (current?.skill_level) parts.push(current.skill_level);
    return parts.slice(0, 3);
  }, [current]);

  return (
    <div
      className="relative h-screen w-screen overflow-hidden flex flex-col text-slate-900"
      style={{ fontFamily: "var(--font-barlow), sans-serif", background: "#bfe3ff" }}
    >
      {/* ---- bright stadium backdrop ---- */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/stadium.png')",
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
          filter: "saturate(1.18) brightness(1.03)",
        }}
      />
      {/* soft light wash so white cards read crisply */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(190,227,255,0.35) 0%, rgba(255,255,255,0.12) 40%, rgba(120,170,230,0.30) 100%)",
        }}
      />
      {/* floodlight glow pools (light) */}
      <div
        className="pointer-events-none absolute inset-0 animate-floodlight"
        style={{
          background:
            "radial-gradient(760px 360px at 12% -14%, rgba(255,255,255,0.55), transparent 66%), radial-gradient(760px 360px at 88% -12%, rgba(186,230,253,0.55), transparent 68%)",
        }}
      />

      {sold && <SoldOverlay name={sold.name} team={sold.team} price={sold.price} />}

      {/* ====================== HEADER ====================== */}
      <header className="relative z-10 shrink-0 h-[96px]">
        <div className="relative h-full px-6 flex items-center justify-between gap-4">
          <Image
            src="/apl-logo.png"
            alt="Autonex Premier League"
            width={420}
            height={280}
            className="ml-3 h-20 w-auto drop-shadow-[0_3px_10px_rgba(10,34,70,0.45)]"
            priority
          />

          {/* center LIVE pill — absolutely centered so logo size never shifts it */}
          <span
            className="hidden md:inline-flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-xl px-6 py-2 text-base font-extrabold tracking-[0.22em] text-white"
            style={{
              background: "rgba(10,34,70,0.92)",
              border: "2px solid rgba(96,165,250,0.6)",
              boxShadow: "0 0 20px rgba(59,130,246,0.6)",
            }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_3px_rgba(239,68,68,0.8)]" />
            LIVE AUCTION
          </span>

          <div className="flex items-center gap-2.5">
            <HeaderStat icon="gavel" label="SOLD" value={soldCount} />
            <HeaderStat icon="stack" label="REMAINING" value={availCount} />
            <HeaderStat icon="rupee" label="BASE PRICE" value={fmt(headerBase)} />
          </div>
        </div>
      </header>

      {/* ====================== BODY ====================== */}
      <main className="relative z-10 flex-1 min-h-0 grid grid-rows-[minmax(0,1.42fr)_minmax(0,1fr)] gap-4 px-4 pb-4 pt-1">
        {/* ---------- UPPER: 12-col grid ---------- */}
        <div className="min-h-0 grid grid-cols-12 gap-4">
          {/* LEFT — Highest Bidders */}
          <WhiteCard className="col-span-3 hidden lg:flex flex-col min-h-0">
            <CardHead icon="crown" title="HIGHEST BIDDERS" sub="INDIVIDUALS" live />
            <div className="flex-1 min-h-0 overflow-auto px-3 pb-3">
              <div className="sticky top-0 z-10 grid grid-cols-[1.4rem_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 bg-white px-1 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <span>#</span>
                <span>Player</span>
                <span>Team</span>
                <span className="text-right">Total&nbsp;(₹)</span>
              </div>
              {topBidders.length === 0 ? (
                <Empty>No players sold yet.</Empty>
              ) : (
                <ul className="space-y-1">
                  {topBidders.map((p, i) => (
                    <li
                      key={p.id}
                      className="grid grid-cols-[1.4rem_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50"
                    >
                      <RankBadge rank={i + 1} />
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar player={p} src={photoOf(p.name)} size={24} />
                        <span className="truncate text-[13px] font-bold text-slate-900">
                          {p.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamBadge name={teamName(p.sold_team)} size={16} />
                        <span className="truncate text-xs font-semibold text-slate-600">
                          {teamName(p.sold_team)}
                        </span>
                      </div>
                      <div className="shrink-0 text-right text-sm font-extrabold tabular-nums text-blue-700">
                        {fmt(p.sold_price)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </WhiteCard>

          {/* CENTER — two stacked cards (profile + console) */}
          <div className="col-span-12 lg:col-span-6 min-h-0 flex flex-col gap-2">
            {/* TOP: player profile (always a card — never an empty box) */}
            <div
              key={current?.id ?? "idle"}
              className="animate-lotZoom relative flex-1 min-h-0 overflow-hidden rounded-2xl p-5 shadow-lg"
              style={{
                background: "linear-gradient(120deg,#ffffff 0%, #eff8ff 55%, #dcefff 100%)",
                border: "1px solid rgba(186,230,253,0.9)",
              }}
            >
              {loading ? (
                <div className="grid h-full place-items-center text-slate-400">Loading…</div>
              ) : current && isOpen ? (
                <div className="flex h-full gap-4">
                  <div className="min-w-0 flex-1 flex flex-col">
                    <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                      Player&nbsp;#{lotNo}
                    </div>
                    <h1
                      style={{ fontFamily: "var(--font-anton)", fontSize: "clamp(1.9rem,3.2vw,3rem)" }}
                      className="mt-0.5 leading-[0.95] text-slate-900"
                    >
                      {current.name}
                    </h1>
                    <div className="mt-0.5 text-sm font-medium text-slate-600">
                      {current.skill || "Player"}
                    </div>

                    {chips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {chips.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 4 mini white boxes — real DB fields */}
                    <div className="mt-auto grid grid-cols-4 gap-2 pt-4">
                      <MiniBox label="LEVEL" value={current.skill_level || "—"} />
                      <MiniBox label="GENDER" value={current.gender === "F" ? "Female" : "Male"} />
                      <MiniBox label="BASE PRICE" value={"₹ " + fmt(current.base_price)} />
                      <MiniBox label="TYPE" value={current.skill || "—"} />
                    </div>
                  </div>

                  {/* portrait */}
                  <div className="relative hidden shrink-0 self-center sm:block">
                    <div
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[16rem] w-[16rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ background: "radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 62%)" }}
                    />
                    <div className="animate-floatY">
                      <Avatar player={current} src={photoOf(current.name)} size={168} ring />
                    </div>
                  </div>
                </div>
              ) : (
                <WaitingHero
                  status={status}
                  soldCount={soldCount}
                  availCount={availCount}
                  topBidder={topBidders[0] ?? null}
                />
              )}
            </div>

            {/* BOTTOM: bidding console (dark navy, always present) */}
            <div
              className="relative shrink-0 grid grid-cols-[1fr_auto_1.2fr] items-center gap-4 rounded-2xl p-4 shadow-2xl"
              style={{
                background: "linear-gradient(90deg,#06152d,#0b254b 50%,#06152d)",
                border: "1px solid rgba(34,211,238,0.4)",
              }}
            >
              {/* current bid */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                  {current && isOpen
                    ? auction?.current_bid == null
                      ? "Opening Bid"
                      : "Current Bid"
                    : "Current Bid"}
                </div>
                <div className="mt-0.5 flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-cyan-400/15 text-cyan-300">
                    <CoinsIcon className="h-5 w-5" />
                  </span>
                  <span
                    style={{ fontFamily: "var(--font-anton)", fontSize: "clamp(2rem,3.2vw,3rem)" }}
                    className="leading-none text-white"
                  >
                    {current && isOpen ? "₹ " + fmt(bid) : "—"}
                  </span>
                </div>
                <div className="mt-1.5 h-5">
                  {current && isOpen && auction?.current_bidder_team ? (
                    <span
                      key={auction.current_bidder_team + String(auction.current_bid)}
                      className="animate-pop inline-flex items-center gap-1.5 rounded-full bg-cyan-400/15 px-3 py-0.5 text-xs font-extrabold text-cyan-200 ring-1 ring-cyan-400/30"
                    >
                      <Gavel className="h-3.5 w-3.5" color={CYAN} />
                      {teamName(auction.current_bidder_team)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {current && isOpen ? "awaiting first bid…" : "waiting for next lot…"}
                    </span>
                  )}
                </div>
              </div>

              {/* circular status widget (honest live state — no fabricated countdown) */}
              <StateRing status={status} open={!!(current && isOpen)} />

              {/* place-bid block */}
              <div className="flex flex-col items-stretch gap-1.5">
                <div
                  className={
                    "grid place-items-center rounded-xl py-3.5 text-base font-extrabold tracking-wide text-white " +
                    (current && isOpen ? "" : "opacity-40")
                  }
                  style={{
                    background: "linear-gradient(90deg,#2563eb,#06b6d4)",
                    boxShadow: current && isOpen ? "0 0 20px rgba(0,180,255,0.6)" : "none",
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Gavel className="h-4 w-4" color="#fff" /> PLACE BID
                  </span>
                </div>
                <div className="text-center text-[11px] font-semibold text-slate-300">
                  Next minimum bid:{" "}
                  <span className="font-extrabold text-cyan-300">
                    ₹ {current && isOpen ? fmt(nextMin) : fmt(auction?.base_price ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Current Status (compact, h-fit) */}
          <div className="col-span-3 hidden lg:block">
            <WhiteCard className="h-fit">
              <CardHead icon="trophy" title="CURRENT STATUS" live />
              <div className="grid grid-cols-3 gap-2 p-3">
                <StatBox value={soldCount} label="SOLD" tone="emerald" />
                <StatBox value={availCount} label="REMAINING" tone="blue" />
                <StatBox value={"₹" + fmt(headerBase)} label="BASE PRICE" tone="slate" />
              </div>
            </WhiteCard>
            {/* decorative cricket ball below (stadium shows through) */}
            <div className="relative mt-4 hidden h-40 place-items-center xl:grid">
              <div
                className="h-32 w-32 rounded-full opacity-90 animate-floatY"
                style={{
                  background:
                    "radial-gradient(circle at 36% 30%, #60a5fa 0%, #2563eb 42%, #1e3a8a 72%, #0f245e 100%)",
                  boxShadow: "0 24px 50px -10px rgba(37,99,235,0.6), inset 0 6px 14px rgba(255,255,255,0.35)",
                }}
              >
                <div
                  className="h-full w-full rounded-full opacity-50"
                  style={{
                    background:
                      "repeating-linear-gradient(115deg, transparent 0 22px, rgba(255,255,255,0.22) 22px 24px)",
                    WebkitMaskImage: "radial-gradient(circle at 36% 30%, #000 58%, transparent 74%)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------- BOTTOM: all teams & members (full-width white) ---------- */}
        <WhiteCard className="min-h-0 flex flex-col">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 shrink-0">
            <UsersIcon className="h-4 w-4 text-slate-700" />
            <span className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
              All Teams &amp; Members
            </span>
            <span className="ml-auto inline-flex items-center gap-4 text-xs font-bold text-slate-700">
              <span>{teams.length} Teams</span>
              <span>{b.players.length} Players</span>
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {ranked.length === 0 ? (
              <Empty>No teams yet.</Empty>
            ) : (
              <div
                className="grid h-full gap-3"
                style={{ gridTemplateColumns: `repeat(${Math.max(1, ranked.length)}, minmax(0,1fr))` }}
              >
                {ranked.map((t) => {
                  const spentPct =
                    budget > 0 ? Math.max(0, Math.min(100, (t.spent / budget) * 100)) : 0;
                  const roster = rosterOf(t.id);
                  const hue = teamHue(t.name);
                  const pName = (id: string | null) =>
                    id ? b.players.find((p) => p.id === id)?.name ?? null : null;
                  const capName = pName(t.captain_id);
                  const vcName = pName(t.vice_captain_id);
                  const openSlots = Math.max(0, (squadSize || roster.length) - roster.length);
                  return (
                    <div
                      key={t.id}
                      className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3"
                    >
                      {/* header */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {t.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.logo_url}
                            alt={t.name}
                            className="h-[38px] w-[38px] shrink-0 rounded-full object-cover ring-1 ring-black/10"
                          />
                        ) : (
                          <TeamBadge name={t.name} size={38} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-sm font-extrabold leading-tight"
                            style={{ color: `hsl(${hue} 70% 42%)` }}
                          >
                            {t.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Spent ₹ {fmt(t.spent)} / ₹ {fmt(budget)}
                          </div>
                          {(capName || vcName) && (
                            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-600">
                              {capName && (
                                <span className="inline-flex items-center gap-1">
                                  <RoleTag role="C" />
                                  <span className="truncate font-semibold">{capName}</span>
                                </span>
                              )}
                              {vcName && (
                                <span className="inline-flex items-center gap-1">
                                  <RoleTag role="VC" />
                                  <span className="truncate font-semibold">{vcName}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* progress + count */}
                      <div className="mt-2 flex items-center gap-2 shrink-0">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: spentPct + "%",
                              background: `linear-gradient(90deg, hsl(${hue} 80% 58%), hsl(${hue} 80% 46%))`,
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-[11px] font-bold text-slate-600">
                          {t.squad_count} / {squadSize || "—"}
                        </span>
                      </div>

                      {/* roster — every member + open slots to show squad progress */}
                      <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-auto pr-0.5">
                        {roster.map((p) => {
                          const role =
                            p.id === t.captain_id ? "C" : p.id === t.vice_captain_id ? "VC" : null;
                          return (
                            <div key={p.id} className="flex items-center gap-1.5">
                              <Avatar player={p} src={photoOf(p.name)} size={20} />
                              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
                                {p.name}
                              </span>
                              {role && <RoleTag role={role} />}
                              <span className="shrink-0 text-[11px] text-slate-400">
                                (₹ {fmt(p.sold_price)})
                              </span>
                            </div>
                          );
                        })}
                        {Array.from({ length: openSlots }).map((_, i) => (
                          <div key={"open-" + i} className="flex items-center gap-1.5 opacity-60">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-400">
                              {roster.length + i + 1}
                            </span>
                            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Open
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </WhiteCard>
      </main>
    </div>
  );
}

/* ---------------- pieces ---------------- */

function WhiteCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={"relative rounded-2xl bg-white text-slate-900 shadow-xl ring-1 ring-black/5 overflow-hidden " + className}>
      {children}
    </section>
  );
}

function CardHead({
  icon,
  title,
  sub,
  live,
}: {
  icon: "crown" | "trophy";
  title: string;
  sub?: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 shrink-0">
      {icon === "crown" ? (
        <CrownIcon className="h-4 w-4 text-amber-500" />
      ) : (
        <TrophyIcon className="h-4 w-4 text-amber-500" />
      )}
      <span className="text-[13px] font-extrabold uppercase tracking-wide text-slate-900">{title}</span>
      {sub && <span className="text-[11px] font-semibold text-slate-400">({sub})</span>}
      {live && (
        <span className="ml-auto inline-flex items-center gap-1 rounded bg-red-500 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
        </span>
      )}
    </div>
  );
}

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-center shadow-sm">
      <div className="text-[9px] font-bold tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 truncate text-xs font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function StatBox({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: "emerald" | "blue" | "slate";
}) {
  const color = tone === "emerald" ? "#059669" : tone === "blue" ? "#2563eb" : "#0f172a";
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 py-3 text-center">
      <div style={{ fontFamily: "var(--font-anton)", color }} className="text-2xl leading-none">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold text-slate-500">{label}</div>
    </div>
  );
}

function StateRing({ status, open }: { status: string; open: boolean }) {
  const label = open ? "LIVE" : status === "paused" ? "HOLD" : status === "done" ? "DONE" : "WAIT";
  return (
    <div
      className="relative grid h-28 w-28 -mt-6 place-items-center rounded-full"
      style={{ background: "#06152d", boxShadow: "0 0 20px rgba(0,229,255,0.4)" }}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke={CYAN}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="276"
          strokeDashoffset={open ? "70" : "180"}
          className={open ? "animate-pulse" : ""}
          style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.9))" }}
        />
      </svg>
      <div className="text-center">
        <div style={{ fontFamily: "var(--font-anton)" }} className="text-3xl leading-none text-white">
          {label}
        </div>
        <div className="mt-0.5 text-[10px] font-bold text-cyan-400">STATUS</div>
      </div>
    </div>
  );
}

function WaitingHero({
  status,
  soldCount,
  availCount,
  topBidder,
}: {
  status: string;
  soldCount: number;
  availCount: number;
  topBidder: Player | null;
}) {
  const map: Record<string, { icon: string; title: string; sub: string }> = {
    done: { icon: "🏆", title: "AUCTION COMPLETE", sub: "All lots have been called" },
    paused: { icon: "⏸️", title: "AUCTION PAUSED", sub: "Bidding resumes shortly" },
    setup: { icon: "🏏", title: "GETTING READY", sub: "Line-up loading" },
    live: { icon: "🏏", title: "NEXT LOT LOADING", sub: "Stand by — a new player is coming up" },
  };
  const s = map[status] ?? map.live;
  return (
    <div className="flex h-full flex-col justify-between pb-1">
      {/* hero — compact, centered, no absolute overlap */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-2 grid h-12 w-12 place-items-center">
          <span
            className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"
            style={{ animationDuration: "2.4s" }}
          />
          <div className="animate-floatY text-2xl">{s.icon}</div>
        </div>
        <div
          style={{ fontFamily: "var(--font-anton)" }}
          className="text-2xl font-black leading-tight tracking-wide text-slate-900"
        >
          {s.title}
        </div>
        <p className="mt-1 text-xs font-medium text-slate-500">{s.sub}</p>
        <div className="mt-3 inline-flex items-center gap-4 rounded-xl border border-slate-100 bg-white/70 px-5 py-2 shadow-sm">
          <HeroStat label="SOLD" value={soldCount} color="#059669" />
          <span className="h-6 w-px bg-slate-200" />
          <HeroStat label="REMAINING" value={availCount} color="#2563eb" />
          {topBidder && (
            <>
              <span className="h-6 w-px bg-slate-200" />
              <div className="text-left">
                <div className="text-[9px] font-bold tracking-wide text-slate-400">TOP BUY</div>
                <div className="text-xs font-extrabold text-slate-900">
                  {topBidder.name} <span className="text-blue-700">₹ {fmt(topBidder.sold_price)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}

function HeroStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div style={{ fontFamily: "var(--font-anton)", color }} className="text-2xl leading-none">
        {value}
      </div>
      <div className="mt-0.5 text-[9px] font-bold tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function RoleTag({ role }: { role: "C" | "VC" }) {
  const isCap = role === "C";
  return (
    <span
      className={
        "shrink-0 grid place-items-center rounded px-1 text-[9px] font-extrabold leading-4 text-white " +
        (isCap ? "bg-amber-500" : "bg-slate-500")
      }
      title={isCap ? "Captain" : "Vice-captain"}
    >
      {role}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const map: Record<number, string> = {
    1: "bg-amber-500 text-white",
    2: "bg-slate-400 text-white",
    3: "bg-amber-700 text-white",
  };
  const cls = map[rank] ?? "bg-slate-200 text-slate-700";
  return (
    <span className={"grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-extrabold " + cls}>
      {rank}
    </span>
  );
}

function TeamBadge({ name, size }: { name: string; size: number }) {
  const hue = teamHue(name);
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-extrabold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(145deg, hsl(${hue} 78% 56%), hsl(${hue} 78% 42%))`,
        boxShadow: `0 2px 6px hsla(${hue},70%,45%,0.4)`,
      }}
    >
      {initials(name)}
    </span>
  );
}

function Avatar({
  player,
  src,
  size,
  ring,
}: {
  player: Player;
  src: string | null;
  size: number;
  ring?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const show = src && !broken;
  const style = {
    width: size,
    height: size,
    boxShadow: ring ? "0 0 0 4px rgba(59,130,246,0.18), 0 0 0 2px #3b82f6" : undefined,
  } as React.CSSProperties;
  if (show) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src!}
        alt={player.name}
        onError={() => setBroken(true)}
        className="rounded-full object-cover"
        style={style}
      />
    );
  }
  return (
    <div
      className="grid place-items-center rounded-full bg-blue-600 text-white"
      style={{ ...style, fontFamily: "var(--font-anton)", fontSize: size * 0.36 }}
    >
      {initials(player.name)}
    </div>
  );
}

function HeaderStat({
  icon,
  label,
  value,
}: {
  icon: "gavel" | "stack" | "rupee";
  label: string;
  value: number | string;
}) {
  return (
    <span
      className="inline-flex items-center gap-2.5 rounded-xl px-4 py-1.5 backdrop-blur-md"
      style={{ background: "rgba(10,34,70,0.82)", border: "1px solid rgba(34,211,238,0.4)" }}
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/15 text-cyan-300">
        <HeaderIcon kind={icon} />
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="text-lg font-extrabold leading-none text-white" style={{ fontFamily: "var(--font-anton)" }}>
          {value}
        </span>
        <span className="mt-0.5 text-[9px] font-bold tracking-wide text-cyan-200/70">{label}</span>
      </span>
    </span>
  );
}

function HeaderIcon({ kind }: { kind: "gavel" | "stack" | "rupee" }) {
  if (kind === "gavel") return <Gavel className="h-4 w-4" color="currentColor" />;
  if (kind === "rupee")
    return (
      <span className="text-sm font-extrabold" style={{ fontFamily: "var(--font-anton)" }}>
        ₹
      </span>
    );
  return <CoinsIcon className="h-4 w-4" />;
}

function CoinsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}

function CrownIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 7l4 4 5-6 5 6 4-4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" />
    </svg>
  );
}

function TrophyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4h12v4a6 6 0 01-12 0V4z" />
      <path d="M6 5H3v2a3 3 0 003 3M18 5h3v2a3 3 0 01-3 3M9 20h6M12 14v6" />
    </svg>
  );
}

function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0112 0M16 6a3 3 0 010 6M21 20a6 6 0 00-5-5.9" />
    </svg>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="grid h-full place-items-center p-8 text-sm text-slate-400">{children}</div>;
}

function SoldOverlay({ name, team, price }: { name: string; team: string; price: number }) {
  const BLUE = "#3b82f6";
  const BLUE_BRIGHT = "#60a5fa";
  const BLUE_DEEP = "#1d4ed8";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm">
      {[...Array(24)].map((_, i) => (
        <span
          key={i}
          className="absolute top-0 h-3 w-2 rounded-sm"
          style={{
            left: `${(i * 4.1) % 100}%`,
            background: [BLUE, BLUE_BRIGHT, BLUE_DEEP, "#93c5fd"][i % 4],
            animation: `confetti ${1.2 + (i % 5) * 0.25}s ${i * 0.04}s ease-in forwards`,
          }}
        />
      ))}
      <div className="relative rounded-3xl bg-white px-14 py-10 text-center shadow-2xl ring-1 ring-blue-200">
        <Gavel className="mx-auto h-24 w-24 animate-hammerStrike" color={BLUE} />
        <div
          style={{ fontFamily: "var(--font-anton)", fontSize: "6rem", color: BLUE_DEEP }}
          className="mt-2 leading-none"
        >
          SOLD!
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-900">{name}</div>
        <div className="text-lg text-slate-500">
          to <span className="font-bold text-slate-900">{team}</span> for{" "}
          <span className="font-extrabold text-blue-700">₹ {fmt(price)}</span>
        </div>
      </div>
    </div>
  );
}
