"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { deletePaper, listPapers, PaperListItem } from "@/src/lib/api";
import { getToken } from "@/src/lib/auth";

export default function PapersPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [rows, setRows] = useState<PaperListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const q = sp.get("q") || "";
  const year = sp.get("year") || "";
  const coded = sp.get("coded") || "";
  const journal = sp.get("journal") || "";

  const query = useMemo(() => ({ q, year, coded, journal }), [q, year, coded, journal]);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  useEffect(() => {
    setBusy(true);
    setError(null);
    listPapers(query)
      .then(setRows)
      .catch((e) => setError(e?.message || "Failed to load papers"))
      .finally(() => setBusy(false));
  }, [query]);

  function setParam(key: string, val: string) {
    const next = new URLSearchParams(sp.toString());
    if (!val) next.delete(key);
    else next.set(key, val);
    router.push(`/papers?${next.toString()}`);
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Delete this paper? This also deletes its PDF(s) and coding history.");
    if (!ok) return;
    setDeletingId(id);
    setError(null);
    try {
      await deletePaper(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="stack stagger">
      <div className="card stack">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div className="section-header">
              <h2>Papers</h2>
            </div>
            <div className="hint" style={{ marginTop: 4 }}>
              Search and filter uploaded research articles.
            </div>
          </div>
          <a className="btn btn-primary" href="/papers/upload">
            Upload PDF
          </a>
        </div>

        <div className="row" style={{ marginTop: 8 }}>
          <div>
            <div className="label">Search</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder="Title, DOI, authors, journal…"
            />
          </div>
          <div>
            <div className="label">Year</div>
            <input
              className="input"
              value={year}
              onChange={(e) => setParam("year", e.target.value)}
              placeholder="2024"
            />
          </div>
          <div>
            <div className="label">Status</div>
            <select
              className="select"
              value={coded}
              onChange={(e) => setParam("coded", e.target.value)}
            >
              <option value="">All papers</option>
              <option value="true">Coded</option>
              <option value="false">Uncoded</option>
            </select>
          </div>
          <div>
            <div className="label">Journal</div>
            <input
              className="input"
              value={journal}
              onChange={(e) => setParam("journal", e.target.value)}
              placeholder="Computers & Education"
            />
          </div>
        </div>

        {busy ? <div className="hint loading-text">Loading papers…</div> : null}
        {error ? (
          <div className="hint" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : null}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>DOI</th>
                <th>Year</th>
                <th>Journal</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ width: 1, whiteSpace: "nowrap" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <a href={`/papers/${r.id}`} className="paper-title">
                      {r.title || "(untitled)"}
                    </a>
                    <div className="hint" style={{ marginTop: 2 }}>
                      {r.authors || ""}
                    </div>
                  </td>
                  <td>
                    <span className="hint mono">{r.doi || "—"}</span>
                  </td>
                  <td className="hint">{r.publication_year ?? "—"}</td>
                  <td className="hint">{r.journal || "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      className={`status-dot ${r.coded ? "coded" : ""}`}
                      title={r.coded ? "Coded" : "Uncoded"}
                    />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <a className="btn" href={`/papers/${r.id}`}>
                        Edit
                      </a>
                      <button
                        className="btn btnDanger"
                        onClick={() => onDelete(r.id)}
                        disabled={busy || deletingId === r.id}
                        aria-disabled={busy || deletingId === r.id}
                      >
                        {deletingId === r.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!busy && rows.length === 0 ? (
                <tr>
                  <td
                    className="hint"
                    colSpan={6}
                    style={{ textAlign: "center", padding: "40px 12px" }}
                  >
                    <div style={{ fontSize: "1.1rem", marginBottom: 4 }}>
                      No papers yet
                    </div>
                    <div>Upload a PDF to begin your review.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
