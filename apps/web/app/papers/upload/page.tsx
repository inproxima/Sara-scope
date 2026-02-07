"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getPaper, PaperDetail, updatePaper, uploadPdf, UploadPdfResponse } from "@/src/lib/api";
import { getToken } from "@/src/lib/auth";

function ConfidencePill({ value }: { value?: "high" | "medium" | "low" }) {
  if (!value) return null;
  const cls =
    value === "high" ? "pill pillHigh" : value === "medium" ? "pill pillMed" : "pill pillLow";
  return <span className={cls}>{value}</span>;
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploadResp, setUploadResp] = useState<UploadPdfResponse | null>(null);
  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  const confidence = uploadResp?.confidence || {};

  const fields = useMemo(
    () => [
      { key: "doi", label: "DOI" },
      { key: "title", label: "Title" },
      { key: "authors", label: "Authors" },
      { key: "journal", label: "Journal" },
      { key: "publication_year", label: "Year" },
      { key: "volume", label: "Volume" },
      { key: "issue", label: "Issue" },
      { key: "page_range", label: "Pages" },
      { key: "corresponding_email", label: "Corresponding email" },
    ],
    []
  );

  async function onUpload(f?: File | null) {
    const toUpload = f ?? file;
    if (!toUpload || busy) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await uploadPdf(toUpload);
      setUploadResp(resp);
      const p = await getPaper(resp.paper_id);
      setPaper(p);
      setForm({
        doi: p.doi || "",
        title: p.title || "",
        authors: p.authors || "",
        journal: p.journal || "",
        publication_year: p.publication_year ?? "",
        volume: p.volume || "",
        issue: p.issue || "",
        page_range: p.page_range || "",
        corresponding_email: p.corresponding_email || "",
      });
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!uploadResp) return;
    setBusy(true);
    setError(null);
    try {
      await updatePaper(uploadResp.paper_id, {
        ...form,
        publication_year: form.publication_year ? Number(form.publication_year) : null,
      });
      router.push(`/papers/${uploadResp.paper_id}`);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack stagger">
      <div className="card card-accent stack">
        <div className="section-header">
          <h2 style={{ margin: 0 }}>Upload PDF</h2>
        </div>
        <div className="hint">Upload a journal article PDF, then review extracted metadata.</div>

        <div className="row" style={{ alignItems: "end" }}>
          <div>
            <div className="label">PDF file</div>
            <input
              className="input"
              type="file"
              accept="application/pdf"
              disabled={busy}
              onChange={(e) => {
                const next = e.target.files?.[0] || null;
                setFile(next);
                setUploadResp(null);
                setPaper(null);
                setForm({});
                setError(null);
                if (next) onUpload(next);
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={() => onUpload()} disabled={!file || busy}>
              {busy ? "Uploading..." : "Upload & extract"}
            </button>
            <a className="btn btn-ghost" href="/papers">
              Back
            </a>
          </div>
        </div>

        {busy ? (
          <div className="hint loading-text">Uploading and extracting metadata…</div>
        ) : null}
        {error ? (
          <div className="hint" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : null}
      </div>

      {uploadResp && paper ? (
        <div className="card stack">
          <div className="section-header">
            <h3 style={{ margin: 0 }}>Review metadata</h3>
          </div>
          <div className="hint">
            Fields are prefilled. Confidence comes from regex/heuristics (and optional Crossref).
          </div>

          <div className="row">
            {fields.map((f) => (
              <div key={f.key}>
                <div className="label">
                  {f.label} <ConfidencePill value={confidence[f.key]} />
                </div>
                <input
                  className="input"
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={onSave} disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </button>
            <a className="btn btn-ghost" href={`/papers/${uploadResp.paper_id}`}>
              Skip review
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
