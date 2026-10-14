"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { teamLogin } from "@/app/actions/team";
import TeamConsole from "./TeamConsole";

interface SavedTeam {
  id: string;
  name: string;
  pin: string;
}

const KEY = "apl_team";

export default function TeamPage() {
  const [team, setTeam] = useState<SavedTeam | null>(null);
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        setTeam(JSON.parse(raw));
      } catch {
        localStorage.removeItem(KEY);
      }
    }
    setReady(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await teamLogin(pin);
    setBusy(false);
    if (res.ok && res.team) {
      localStorage.setItem(KEY, JSON.stringify(res.team));
      setTeam(res.team);
    } else {
      setErr(res.error ?? "Login failed.");
    }
  }

  function logout() {
    localStorage.removeItem(KEY);
    setTeam(null);
    setPin("");
  }

  if (!ready) return null;

  if (team) return <TeamConsole team={team} onLogout={logout} />;

  return (
    <>
      <Header subtitle="Team Captain" />
      <main className="mx-auto max-w-sm px-5 py-20">
        <div className="card p-7 animate-pop">
          <h1 className="text-xl font-bold text-navy">Join the auction</h1>
          <p className="text-sm text-muted mt-1">Enter your team PIN to start bidding.</p>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="label">Team PIN</label>
              <input
                className="input uppercase tracking-widest text-center text-lg font-bold"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\s/g, ""))}
                maxLength={10}
                autoFocus
                placeholder="• • • •"
              />
            </div>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button className="btn btn-primary w-full" disabled={busy || pin.length < 3}>
              {busy ? "Checking…" : "Enter auction"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
