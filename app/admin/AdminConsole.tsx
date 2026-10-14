"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Header from "@/components/Header";
import { useLiveData } from "@/lib/useLiveData";
import { computeStandings } from "@/lib/standings";
import { fmt } from "@/lib/format";
import type { Gender, Player } from "@/lib/types";
import {
  adminLogout,
  updateConfig,
  addPlayers,
  addPlayer,
  updatePlayerBase,
  deletePlayer,
  clearAllPlayers,
  addTeam,
  updateTeam,
  setTeamMeta,
  deleteTeam,
  openLot,
  closeLotSold,
  closeLotUnsold,
  reopenPlayer,
  resetAuction,
} from "@/app/actions/admin";

type Tab = "setup" | "players" | "teams" | "run";

export default function AdminConsole() {
  const { auction, players, teams, loading, connected } = useLiveData();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("run");
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);

  const standings = useMemo(
    () => computeStandings(teams, players, auction),
    [teams, players, auction]
  );
  const teamName = (id: string | null) =>
    teams.find((t) => t.id === id)?.name ?? "—";

  function flash(ok: boolean, m: string) {
    setMsg({ t: ok ? "ok" : "err", m });
    setTimeout(() => setMsg(null), 3500);
  }
  async function run(p: Promise<{ ok: boolean; error?: string }>, okMsg = "Done.") {
    const r = await p;
    flash(r.ok, r.ok ? okMsg : r.error ?? "Error");
    return r.ok;
  }

  if (loading || !auction)
    return (
      <>
        <Header subtitle="Admin Console" />
        <main className="mx-auto max-w-6xl px-5 py-20 text-muted">Loading…</main>
      </>
    );

  return (
    <>
      <Header
        subtitle="Admin Console"
        right={
          <>
            <span className={"pill " + (connected ? "bg-blue-50 text-navy" : "bg-amber-50 text-warning")}>
              <span className={"h-2 w-2 rounded-full " + (connected ? "bg-success" : "bg-warning")} />
              {connected ? "Live" : "Connecting"}
            </span>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                await adminLogout();
                router.refresh();
              }}
            >
              Sign out
            </button>
          </>
        }
      />

      {/* tabs */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-5 flex gap-1">
          {(["run", "setup", "players", "teams"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "px-4 py-3 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors " +
                (tab === t
                  ? "border-blue text-navy"
                  : "border-transparent text-muted hover:text-navy")
              }
            >
              {t === "run" ? "Run Auction" : t}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="mx-auto max-w-6xl px-5 pt-4">
          <div
            className={
              "rounded-lg px-4 py-2 text-sm font-medium " +
              (msg.t === "ok" ? "bg-blue-50 text-navy" : "bg-red-50 text-danger")
            }
          >
            {msg.m}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-5 py-6">
        {tab === "setup" && <SetupTab auction={auction} run={run} />}
        {tab === "players" && (
          <PlayersTab players={players} run={run} flash={flash} />
        )}
        {tab === "teams" && (
          <TeamsTab standings={standings} players={players} run={run} />
        )}
        {tab === "run" && (
          <RunTab
            auction={auction}
            players={players}
            standings={standings}
            teamName={teamName}
            run={run}
          />
        )}
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Setup tab — global config                                          */
/* ------------------------------------------------------------------ */
function SetupTab({
  auction,
  run,
}: {
  auction: import("@/lib/types").Auction;
  run: (p: Promise<{ ok: boolean; error?: string }>, m?: string) => Promise<boolean>;
}) {
  const [f, setF] = useState({
    name: auction.name,
    budget_per_team: auction.budget_per_team,
    squad_size: auction.squad_size,
    base_price: auction.base_price,
    bid_increment: auction.bid_increment,
    min_females_per_team: auction.min_females_per_team,
  });
  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="card p-6 lg:col-span-2 space-y-4">
        <h2 className="font-bold text-navy">Auction configuration</h2>
        <div>
          <label className="label">League name</label>
          <input
            className="input"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Budget per team">
            <input className="input" type="number" value={f.budget_per_team}
              onChange={(e) => setF({ ...f, budget_per_team: num(e.target.value) })} />
          </Field>
          <Field label="Squad size (players per team)">
            <input className="input" type="number" value={f.squad_size}
              onChange={(e) => setF({ ...f, squad_size: num(e.target.value) })} />
          </Field>
          <Field label="Default base price (for players without one)">
            <input className="input" type="number" value={f.base_price}
              onChange={(e) => setF({ ...f, base_price: num(e.target.value) })} />
          </Field>
          <Field label="Bid increment (raise step)">
            <input className="input" type="number" value={f.bid_increment}
              onChange={(e) => setF({ ...f, bid_increment: num(e.target.value) })} />
          </Field>
          <Field label="Min females per team">
            <input className="input" type="number" value={f.min_females_per_team}
              onChange={(e) => setF({ ...f, min_females_per_team: num(e.target.value) })} />
          </Field>
        </div>
        <button
          className="btn btn-navy"
          onClick={() => run(updateConfig(f), "Configuration saved.")}
        >
          Save configuration
        </button>
      </div>

      <div className="card p-6 space-y-3 h-fit">
        <h3 className="font-bold text-navy">How it works</h3>
        <Stat label="Budget per team" value={fmt(f.budget_per_team)} />
        <Stat label="Max players per team" value={String(f.squad_size)} />
        <p className="text-xs text-muted leading-relaxed pt-2 border-t">
          A team can bid up to its full remaining purse on any player. Squad size
          is just a cap — teams don&apos;t have to fill it, and unsold players are
          fine. Min females per team is a target shown on the Run tab, not a hard
          block.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Players tab — upload / add / list                                  */
/* ------------------------------------------------------------------ */
function PlayersTab({
  players,
  run,
  flash,
}: {
  players: Player[];
  run: (p: Promise<{ ok: boolean; error?: string }>, m?: string) => Promise<boolean>;
  flash: (ok: boolean, m: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("M");
  const [basePrice, setBasePrice] = useState("");
  const [uploading, setUploading] = useState(false);

  const total = players.length;
  const females = players.filter((p) => p.gender === "F").length;
  const sold = players.filter((p) => p.status === "sold").length;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      const parsed = rows
        .map((r) => {
          const keys = Object.keys(r);
          const nameKey = keys.find((k) => /name/i.test(k)) ?? keys[0];
          const genderKey = keys.find((k) => /gender|sex/i.test(k));
          const baseKey = keys.find((k) => /base|price|value|amount/i.test(k));
          const levelKey = keys.find((k) => /level|rating|grade/i.test(k));
          const skillKey = keys.find((k) => /skill|role|category|position/i.test(k) && k !== levelKey);
          const nm = String(r[nameKey] ?? "").trim();
          const gv = genderKey ? String(r[genderKey] ?? "").trim().toUpperCase() : "M";
          const g: Gender = gv.startsWith("F") ? "F" : "M";
          const bp = baseKey ? Math.floor(Number(r[baseKey]) || 0) : 0;
          const skill = skillKey ? String(r[skillKey] ?? "").trim() : "";
          const skill_level = levelKey ? String(r[levelKey] ?? "").trim() : "";
          return { name: nm, gender: g, base_price: bp, skill, skill_level };
        })
        .filter((r) => r.name);
      if (parsed.length === 0) {
        flash(false, "No rows with a name found in that file.");
      } else {
        await run(addPlayers(parsed), `Imported ${parsed.length} players.`);
      }
    } catch {
      flash(false, "Could not read that file. Use .xlsx or .csv.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-1">
        <div className="card p-6 space-y-3">
          <h2 className="font-bold text-navy">Import from Excel</h2>
          <p className="text-sm text-muted">
            Upload a <b>.xlsx</b> or <b>.csv</b> with a <b>Name</b> column, a{" "}
            <b>Gender</b> column (M/F), and optionally <b>Base</b> price,{" "}
            <b>Skill</b>, and <b>Skill Level</b> columns. Missing base prices use
            the default floor.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFile}
            className="hidden"
          />
          <button
            className="btn btn-primary w-full"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Importing…" : "Choose file"}
          </button>
        </div>

        <div className="card p-6 space-y-3">
          <h3 className="font-bold text-navy">Add one player</h3>
          <input
            className="input"
            placeholder="Player name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2">
            {(["M", "F"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={
                  "btn flex-1 " + (gender === g ? "btn-navy" : "btn-ghost")
                }
              >
                {g === "M" ? "Male" : "Female"}
              </button>
            ))}
          </div>
          <input
            className="input"
            type="number"
            placeholder="Base price (blank = default)"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
          />
          <button
            className="btn btn-primary w-full"
            disabled={!name.trim()}
            onClick={async () => {
              const bp = Math.floor(Number(basePrice) || 0);
              const ok = await run(addPlayer(name, gender, bp), "Player added.");
              if (ok) { setName(""); setBasePrice(""); }
            }}
          >
            Add player
          </button>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-navy mb-3">Pool</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Total" value={total} />
            <MiniStat label="Female" value={females} />
            <MiniStat label="Sold" value={sold} />
          </div>
          {total > 0 && (
            <button
              className="btn btn-danger w-full mt-4"
              onClick={() => {
                if (confirm("Delete ALL players? This cannot be undone.")) {
                  run(clearAllPlayers(), "All players cleared.");
                }
              }}
            >
              Clear all players
            </button>
          )}
        </div>
      </div>

      <div className="card p-0 lg:col-span-2 overflow-hidden">
        <div className="px-5 py-3 border-b font-bold text-navy">
          Players ({total})
        </div>
        {total === 0 ? (
          <p className="p-8 text-center text-muted">No players yet. Import an Excel file to begin.</p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b text-muted text-left">
                <tr>
                  <th className="px-5 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Gender</th>
                  <th className="px-3 py-2 font-semibold">Base price</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-blue-50/40">
                    <td className="px-5 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2">
                      <span className={"pill " + (p.gender === "F" ? "bg-pink-50 text-pink-700" : "bg-blue-50 text-navy")}>
                        {p.gender}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <BaseCell player={p} run={run} />
                    </td>
                    <td className="px-3 py-2 capitalize text-muted">{p.status}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="text-danger text-xs font-semibold hover:underline"
                        onClick={() => run(deletePlayer(p.id), "Player removed.")}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Teams tab                                                          */
/* ------------------------------------------------------------------ */
function TeamsTab({
  standings,
  players,
  run,
}: {
  standings: import("@/lib/types").TeamStanding[];
  players: Player[];
  run: (p: Promise<{ ok: boolean; error?: string }>, m?: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [logo, setLogo] = useState("");

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="card p-6 space-y-3 h-fit">
        <h2 className="font-bold text-navy">Create team</h2>
        <input className="input" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input uppercase" placeholder="PIN (3–10 chars)" value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\s/g, ""))} maxLength={10} />
        <input className="input" placeholder="Logo image URL (optional)" value={logo}
          onChange={(e) => setLogo(e.target.value)} />
        <button
          className="btn btn-navy w-full"
          disabled={!name.trim() || pin.length < 3}
          onClick={async () => {
            const ok = await run(addTeam(name, pin, logo), "Team created.");
            if (ok) { setName(""); setPin(""); setLogo(""); }
          }}
        >
          Add team
        </button>
        <p className="text-xs text-muted">Share each team&apos;s PIN with its captain to log in and bid. Captain &amp; vice-captain are set per team below.</p>
      </div>

      <div className="lg:col-span-2 space-y-3">
        {standings.length === 0 && (
          <div className="card p-8 text-center text-muted">No teams yet.</div>
        )}
        {standings.map((t) => (
          <TeamRow key={t.id} t={t} players={players} run={run} />
        ))}
      </div>
    </div>
  );
}

function TeamRow({
  t,
  players,
  run,
}: {
  t: import("@/lib/types").TeamStanding;
  players: Player[];
  run: (p: Promise<{ ok: boolean; error?: string }>, m?: string) => Promise<boolean>;
}) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(t.name);
  const [pin, setPin] = useState(t.pin);
  const [logo, setLogo] = useState(t.logo_url ?? "");
  const [cap, setCap] = useState(t.captain_id ?? "");
  const [vc, setVc] = useState(t.vice_captain_id ?? "");

  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? null;

  function reset() {
    setName(t.name);
    setPin(t.pin);
    setLogo(t.logo_url ?? "");
    setCap(t.captain_id ?? "");
    setVc(t.vice_captain_id ?? "");
  }

  return (
    <div className="card p-5">
      {edit ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input className="input flex-1 min-w-40" value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" />
            <input className="input w-32 uppercase" value={pin} onChange={(e) => setPin(e.target.value.replace(/\s/g, ""))} maxLength={10} placeholder="PIN" />
          </div>
          <input className="input" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="Logo image URL (optional)" />
          <div className="flex flex-wrap gap-2">
            <label className="flex-1 min-w-40 text-sm">
              <span className="text-xs font-semibold text-muted">Captain</span>
              <select className="input mt-1" value={cap} onChange={(e) => setCap(e.target.value)}>
                <option value="">— none —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === vc}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="flex-1 min-w-40 text-sm">
              <span className="text-xs font-semibold text-muted">Vice-captain</span>
              <select className="input mt-1" value={vc} onChange={(e) => setVc(e.target.value)}>
                <option value="">— none —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === cap}>{p.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={async () => {
              const ok1 = await run(updateTeam(t.id, name, pin), "Team updated.");
              if (!ok1) return;
              const ok2 = await run(
                setTeamMeta(t.id, { logo_url: logo, captain_id: cap || null, vice_captain_id: vc || null }),
                "Team updated."
              );
              if (ok2) setEdit(false);
            }}>Save</button>
            <button className="btn btn-ghost" onClick={() => { setEdit(false); reset(); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {t.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logo_url} alt={t.name} className="h-10 w-10 rounded-full object-cover ring-1 ring-black/10" />
            ) : null}
            <div>
              <div className="font-bold text-navy">{t.name}</div>
              <div className="text-xs text-muted">PIN <span className="font-mono font-bold text-navy">{t.pin}</span></div>
              <div className="text-xs text-muted">
                C: <span className="font-semibold text-navy">{nameOf(t.captain_id) ?? "—"}</span>
                {"  ·  "}VC: <span className="font-semibold text-navy">{nameOf(t.vice_captain_id) ?? "—"}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-5 text-sm">
            <KV k="Spent" v={fmt(t.spent)} />
            <KV k="Remaining" v={fmt(t.remaining)} />
            <KV k="Squad" v={String(t.squad_count)} />
            <KV k="Female" v={String(t.female_count)} />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setEdit(true)}>Edit</button>
            <button className="btn btn-danger" onClick={() => {
              if (confirm(`Delete team "${t.name}"? Its players return to the pool.`))
                run(deleteTeam(t.id), "Team deleted.");
            }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Run tab — the live auction controls                                */
/* ------------------------------------------------------------------ */
function RunTab({
  auction,
  players,
  standings,
  teamName,
  run,
}: {
  auction: import("@/lib/types").Auction;
  players: Player[];
  standings: import("@/lib/types").TeamStanding[];
  teamName: (id: string | null) => string;
  run: (p: Promise<{ ok: boolean; error?: string }>, m?: string) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const current = players.find((p) => p.id === auction.current_player_id) ?? null;
  const available = players.filter(
    (p) => p.status === "available" && p.name.toLowerCase().includes(search.toLowerCase())
  );
  const unsold = players.filter((p) => p.status === "unsold");
  const minBid =
    auction.current_bid == null
      ? current?.base_price ?? auction.base_price
      : auction.current_bid + auction.bid_increment;

  const deficits = standings.filter((s) => s.female_count < auction.min_females_per_team);
  const availableFemales = players.filter((p) => p.status === "available" && p.gender === "F").length;
  const neededFemales = deficits.reduce((s, d) => s + (auction.min_females_per_team - d.female_count), 0);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* live lot */}
      <div className="lg:col-span-2 space-y-5">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-navy">Live lot</h2>
            <span className={"pill " + (auction.lot_status === "open" ? "bg-green-50 text-success" : "bg-slate-100 text-muted")}>
              {auction.lot_status === "open" ? "OPEN" : "IDLE"}
            </span>
          </div>

          {current ? (
            <div className="mt-4">
              <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                  <div className="text-3xl font-extrabold text-navy">{current.name}</div>
                  <span className={"pill mt-2 " + (current.gender === "F" ? "bg-pink-50 text-pink-700" : "bg-blue-50 text-navy")}>
                    {current.gender === "F" ? "Female" : "Male"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted uppercase tracking-wide">Current bid</div>
                  <div className="text-3xl font-extrabold text-blue">{fmt(auction.current_bid)}</div>
                  <div className="text-sm text-muted">
                    {auction.current_bidder_team ? "by " + teamName(auction.current_bidder_team) : "no bids yet"}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="btn btn-success" onClick={() => run(closeLotSold(), "Marked SOLD.")}>
                  Mark SOLD {auction.current_bidder_team ? "→ " + teamName(auction.current_bidder_team) : ""}
                </button>
                <button className="btn btn-ghost" onClick={() => run(closeLotUnsold(), "Marked unsold.")}>
                  Mark unsold
                </button>
                <span className="text-sm text-muted self-center">Next required bid: <b className="text-navy">{fmt(minBid)}</b></span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-muted">No lot on the block. Pick an available player below to open bidding.</p>
          )}
        </div>

        {/* pick next */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between gap-3">
            <span className="font-bold text-navy">Available players ({available.length})</span>
            <input className="input w-48" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {available.length === 0 ? (
            <p className="p-8 text-center text-muted">No available players.</p>
          ) : (
            <div className="max-h-[48vh] overflow-auto divide-y">
              {available.map((p) => (
                <div key={p.id} className="px-5 py-2.5 flex items-center justify-between hover:bg-blue-50/40">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{p.name}</span>
                    <span className={"pill " + (p.gender === "F" ? "bg-pink-50 text-pink-700" : "bg-blue-50 text-navy")}>{p.gender}</span>
                    <span className="text-xs text-muted">base {fmt(p.base_price)}</span>
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={auction.lot_status === "open"}
                    onClick={() => run(openLot(p.id), `Opened bidding for ${p.name}.`)}
                  >
                    Put on block
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {unsold.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-navy mb-2">Unsold ({unsold.length})</h3>
            <div className="flex flex-wrap gap-2">
              {unsold.map((p) => (
                <button key={p.id} className="btn btn-ghost" onClick={() => run(reopenPlayer(p.id), `${p.name} back in pool.`)}>
                  {p.name} ↩
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* side: standings + controls */}
      <div className="space-y-5">
        <div className="card p-5">
          <h3 className="font-bold text-navy mb-3">Female balance</h3>
          <div className="text-sm space-y-1">
            <KV k="Min per team" v={String(auction.min_females_per_team)} />
            <KV k="Females still needed" v={String(neededFemales)} />
            <KV k="Females still available" v={String(availableFemales)} />
          </div>
          {neededFemales > availableFemales && (
            <p className="mt-3 text-xs text-danger font-medium">
              ⚠ Not enough available females to satisfy every team&apos;s minimum. Add more or lower the minimum.
            </p>
          )}
          {deficits.length > 0 && (
            <div className="mt-3 pt-3 border-t text-xs text-muted">
              Still short: {deficits.map((d) => `${d.name} (${auction.min_females_per_team - d.female_count})`).join(", ")}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-navy mb-3">Standings</h3>
          <div className="space-y-2">
            {standings.length === 0 && <p className="text-sm text-muted">No teams yet.</p>}
            {standings
              .slice()
              .sort((a, b) => b.spent - a.spent)
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <span className="font-semibold text-navy">{t.name}</span>
                  <span className="text-muted">
                    {t.squad_count}/{auction.squad_size} · {t.female_count}♀ · {fmt(t.remaining)} left
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="card p-5 space-y-2">
          <h3 className="font-bold text-navy mb-1">Export & reset</h3>
          <ExportButton players={players} teamName={teamName} />
          <button
            className="btn btn-danger w-full"
            onClick={() => {
              if (confirm("Reset the whole auction? All sales are cleared and players return to the pool. Teams and players are kept."))
                run(resetAuction(), "Auction reset.");
            }}
          >
            Reset auction
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportButton({
  players,
  teamName,
}: {
  players: Player[];
  teamName: (id: string | null) => string;
}) {
  function exportXlsx() {
    const sold = players.filter((p) => p.status === "sold");
    const rows = sold.map((p) => ({
      Player: p.name,
      Gender: p.gender,
      Team: teamName(p.sold_team),
      Price: p.sold_price ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Player: "", Gender: "", Team: "", Price: "" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "apl-auction-results.xlsx");
  }
  return (
    <button className="btn btn-navy w-full" onClick={exportXlsx}>
      Export results (.xlsx)
    </button>
  );
}

// inline-editable base price for a player (commits on blur / Enter)
function BaseCell({
  player,
  run,
}: {
  player: Player;
  run: (p: Promise<{ ok: boolean; error?: string }>, m?: string) => Promise<boolean>;
}) {
  const [val, setVal] = useState(String(player.base_price));
  const dirty = Number(val) !== player.base_price;
  const locked = player.status === "sold";
  async function commit() {
    if (!dirty) return;
    const ok = await run(updatePlayerBase(player.id, Number(val) || 0), "Base price updated.");
    if (!ok) setVal(String(player.base_price));
  }
  return (
    <input
      type="number"
      value={val}
      disabled={locked}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={
        "w-24 rounded-md border px-2 py-1 text-sm " +
        (locked ? "bg-slate-50 text-muted" : dirty ? "border-blue bg-blue-50" : "border-border")
      }
    />
  );
}

/* ---- tiny presentational helpers ---- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={"font-bold " + (warn ? "text-danger" : "text-navy")}>{value}</span>
    </div>
  );
}
function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-blue-50 rounded-lg py-3">
      <div className="text-xl font-extrabold text-navy">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-center">
      <div className="text-[11px] text-muted uppercase tracking-wide">{k}</div>
      <div className="font-bold text-navy">{v}</div>
    </div>
  );
}
