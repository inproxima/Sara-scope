"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { codebookV1, getCodebookDefinitionSet, getCodeDefinition } from "@/src/codebook/v1";
import { createCode, deletePaper, getPaper, listCodes, updatePaper } from "@/src/lib/api";
import { getToken } from "@/src/lib/auth";
import { Tooltip } from "@/src/components/Tooltip";

export default function PaperDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [paper, setPaper] = useState<any | null>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});
  const [meta, setMeta] = useState<Record<string, any>>({});
  const [codeForm, setCodeForm] = useState<Record<string, any>>({ codebook_version: "v1" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  async function refresh() {
    const p = await getPaper(id);
    const c = await listCodes(id);
    setPaper(p);
    setCodes(c);
    setMeta({
      doi: p.doi || "",
      title: p.title || "",
      authors: p.authors || "",
      journal: p.journal || "",
      publication_year: p.publication_year ?? "",
      volume: p.volume || "",
      issue: p.issue || "",
      page_range: p.page_range || "",
      corresponding_email: p.corresponding_email || "",
      abstract: p.abstract || "",
      source: p.source || "",
    });
  }

  useEffect(() => {
    refresh().catch((e) => setError(e?.message || "Failed to load paper"));
  }, [id]);

  async function saveMeta() {
    setBusy(true);
    setError(null);
    try {
      await updatePaper(id, {
        ...meta,
        publication_year: meta.publication_year ? Number(meta.publication_year) : null,
      });
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    setBusy(true);
    setError(null);
    try {
      await createCode(id, codeForm);
      setCodeForm({ codebook_version: "v1" });
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  const pdfUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    return `${base}/papers/${id}/pdf`;
  }, [id]);

  async function downloadPdf() {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    const res = await fetch(pdfUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function onDeletePaper() {
    const ok = window.confirm("Delete this paper? This also deletes its PDF(s) and coding history.");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await deletePaper(id);
      router.push("/papers");
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (!paper) {
    return (
      <div className="card stack">
        <div className="hint loading-text">Loading paper…</div>
        {error ? (
          <div className="hint" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="stack stagger">
      {/* ── Header ── */}
      <div className="card card-accent stack">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{paper.title || "(untitled)"}</h2>
            <div className="hint" style={{ marginTop: 4 }}>{paper.authors || ""}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            <Link className="btn btn-ghost" href="/papers">
              Back
            </Link>
            {paper.pdf_available ? (
              <button className="btn" onClick={() => downloadPdf().catch((e) => setError(e.message))}>
                Open PDF
              </button>
            ) : null}
            <button
              className="btn btnDanger"
              onClick={() => onDeletePaper().catch((e) => setError(e.message))}
              disabled={busy}
            >
              Delete
            </button>
          </div>
        </div>

        {error ? (
          <div className="hint" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : null}
      </div>

      {/* ── Metadata ── */}
      <div className="card stack">
        <div className="section-header">
          <h3 style={{ margin: 0 }}>Metadata</h3>
        </div>
        <div className="row">
          {[
            ["doi", "DOI"],
            ["title", "Title"],
            ["authors", "Authors"],
            ["journal", "Journal"],
            ["publication_year", "Year"],
            ["volume", "Volume"],
            ["issue", "Issue"],
            ["page_range", "Pages"],
            ["corresponding_email", "Corresponding email"],
            ["source", "Source"],
          ].map(([k, label]) => (
            <div key={k as string}>
              <div className="label">{label}</div>
              <input
                className="input"
                value={meta[k as string] ?? ""}
                onChange={(e) => setMeta((p) => ({ ...p, [k as string]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div>
          <div className="label">Abstract</div>
          <textarea
            className="textarea"
            value={meta.abstract ?? ""}
            onChange={(e) => setMeta((p) => ({ ...p, abstract: e.target.value }))}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={saveMeta} disabled={busy}>
            {busy ? "Saving..." : "Save metadata"}
          </button>
        </div>
      </div>

      {/* ── Coding Form ── */}
      <div className="card stack">
        <div className="section-header">
          <h3 style={{ margin: 0 }}>Code this paper</h3>
        </div>
        <div className="hint">Submitting creates a new coding record; it never overwrites previous codes.</div>

        <div className="row">
          {codebookV1.map((f) => (
            <div key={f.key}>
              <div className="label" style={{ display: "flex", alignItems: "center" }}>
                <span>{f.label}</span>
                {(() => {
                  const def = getCodeDefinition(codeForm.codebook_version, f.key);
                  if (!def) return null;

                  const book = getCodebookDefinitionSet(codeForm.codebook_version);
                  const optLabel = new Map((f.options || []).map((o) => [o.value, o.label]));
                  const prettyAllowedKey = (k: string) => {
                    if (k === "true") return "Yes";
                    if (k === "false") return "No";
                    return optLabel.get(k) || k;
                  };

                  const content = (
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{f.label}</div>
                      {book?.scope_update?.note ? (
                        <div className="hint" style={{ marginBottom: 6 }}>
                          {book.scope_update.note}
                        </div>
                      ) : null}
                      <div>{def.definition}</div>
                      {def.decision_rule ? (
                        <div className="hint" style={{ marginTop: 8 }}>
                          <span style={{ color: "var(--text)", fontWeight: 700 }}>Decision rule:</span>{" "}
                          {def.decision_rule}
                        </div>
                      ) : null}
                      {def.allowed_values ? (
                        <ul className="tooltipList">
                          {Object.entries(def.allowed_values).map(([k, v]) => (
                            <li key={k}>
                              <span style={{ fontWeight: 700 }}>{prettyAllowedKey(k)}</span>
                              {optLabel.has(k) ? <span className="hint"> ({k})</span> : null}
                              {": "}
                              {v}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );

                  return <Tooltip ariaLabel={`${f.label} definition`} content={content} />;
                })()}
              </div>
              {f.type === "select" ? (
                <select
                  className="select"
                  value={codeForm[f.key] ?? ""}
                  onChange={(e) => setCodeForm((p) => ({ ...p, [f.key]: e.target.value || null }))}
                >
                  <option value="">(unset)</option>
                  {(f.options || []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "boolean" ? (
                <label className="hint" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(codeForm[f.key] ?? false)}
                    onChange={(e) => setCodeForm((p) => ({ ...p, [f.key]: e.target.checked }))}
                  />
                  {codeForm[f.key] ? "Yes" : "No"}
                </label>
              ) : f.type === "textarea" ? (
                <textarea
                  className="textarea"
                  value={codeForm[f.key] ?? ""}
                  onChange={(e) => setCodeForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              ) : (
                <input
                  className="input"
                  value={codeForm[f.key] ?? ""}
                  onChange={(e) => setCodeForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              )}
              {f.hint ? <div className="hint">{f.hint}</div> : null}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={submitCode} disabled={busy}>
            {busy ? "Submitting..." : "Submit coding"}
          </button>
        </div>
      </div>

      {/* ── Coding History ── */}
      <div className="card stack">
        <div className="section-header">
          <h3 style={{ margin: 0 }}>Coding history</h3>
        </div>
        <div className="hint">Latest first.</div>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Coder</th>
              <th>Confidence</th>
              <th>Notes</th>
              <th>Codes</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => {
              const isExpanded = Boolean(expandedCodes[c.id]);
              return (
                <Fragment key={c.id}>
                  <tr>
                    <td className="hint mono">{c.coded_at}</td>
                    <td className="hint">{c.coded_by_email || ""}</td>
                    <td className="hint">{c.coding_confidence || ""}</td>
                    <td className="hint">{c.coding_notes_20w || ""}</td>
                    <td>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => setExpandedCodes((p) => ({ ...p, [c.id]: !p[c.id] }))}
                      >
                        {isExpanded ? "Hide" : "Show"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="hint" style={{ marginBottom: 8 }}>
                          Codebook: {c.codebook_version || "v1"}
                        </div>
                        <div className="row">
                          {codebookV1.map((f) => {
                            const def = getCodeDefinition(c.codebook_version, f.key);
                            const book = getCodebookDefinitionSet(c.codebook_version);
                            const optLabel = new Map((f.options || []).map((o) => [o.value, o.label]));
                            const prettyAllowedKey = (k: string) => {
                              if (k === "true") return "Yes";
                              if (k === "false") return "No";
                              return optLabel.get(k) || k;
                            };

                            const tooltipContent = def ? (
                              <div>
                                <div style={{ fontWeight: 700, marginBottom: 6 }}>{f.label}</div>
                                {book?.scope_update?.note ? (
                                  <div className="hint" style={{ marginBottom: 6 }}>
                                    {book.scope_update.note}
                                  </div>
                                ) : null}
                                <div>{def.definition}</div>
                                {def.decision_rule ? (
                                  <div className="hint" style={{ marginTop: 8 }}>
                                    <span style={{ color: "var(--text)", fontWeight: 700 }}>Decision rule:</span>{" "}
                                    {def.decision_rule}
                                  </div>
                                ) : null}
                                {def.allowed_values ? (
                                  <ul className="tooltipList">
                                    {Object.entries(def.allowed_values).map(([k, v]) => (
                                      <li key={k}>
                                        <span style={{ fontWeight: 700 }}>{prettyAllowedKey(k)}</span>
                                        {optLabel.has(k) ? <span className="hint"> ({k})</span> : null}
                                        {": "}
                                        {v}
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </div>
                            ) : null;

                            const rawVal = c[f.key];
                            let displayVal: string = "—";
                            if (rawVal === null || rawVal === undefined || rawVal === "") displayVal = "—";
                            else if (f.type === "boolean") displayVal = rawVal ? "Yes" : "No";
                            else if (f.type === "select") displayVal = optLabel.get(String(rawVal)) || String(rawVal);
                            else displayVal = String(rawVal);

                            return (
                              <div key={f.key}>
                                <div className="label" style={{ display: "flex", alignItems: "center" }}>
                                  <span>{f.label}</span>
                                  {def && tooltipContent ? (
                                    <Tooltip ariaLabel={`${f.label} definition`} content={tooltipContent} />
                                  ) : null}
                                </div>
                                <div>{displayVal}</div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {codes.length === 0 ? (
              <tr>
                <td className="hint" colSpan={5} style={{ textAlign: "center", padding: "32px 12px" }}>
                  No coding yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
