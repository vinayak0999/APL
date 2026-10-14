"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/app/actions/admin";
import Header from "@/components/Header";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await adminLogin(pw);
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr(res.error ?? "Login failed.");
  }

  return (
    <>
      <Header subtitle="Admin Console" />
      <main className="mx-auto max-w-sm px-5 py-20">
        <div className="card p-7 animate-pop">
          <h1 className="text-xl font-bold text-navy">Admin sign in</h1>
          <p className="text-sm text-muted mt-1">Enter the admin password to run the auction.</p>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoFocus
              />
            </div>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button className="btn btn-navy w-full" disabled={busy || !pw}>
              {busy ? "Checking…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
