"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { login, me } from "@/src/lib/api";
import { getToken, setToken } from "@/src/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    me()
      .then(() => router.push("/papers"))
      .catch(() => {
        /* ignore */
      });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const resp = await login(email, inviteCode || undefined);
      setToken(resp.access_token);
      router.push("/papers");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
      <div
        className="card card-accent stack"
        style={{ maxWidth: 480, width: "100%" }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Sign In</h2>
          <div className="hint" style={{ marginTop: 4 }}>
            Invite-only access. Your email must be on the approved list.
          </div>
        </div>
        <form onSubmit={onSubmit} className="stack">
          <div>
            <div className="label">Email address</div>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="researcher@university.edu"
              required
              type="email"
              autoComplete="email"
            />
          </div>
          <div>
            <div className="label">Invite code</div>
            <input
              className="input"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {error ? (
            <div className="hint" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          ) : null}
          <button
            className="btn btn-primary"
            disabled={busy}
            style={{ marginTop: 4 }}
          >
            {busy ? "Authenticating..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
