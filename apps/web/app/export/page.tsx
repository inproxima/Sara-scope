"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { downloadCsv } from "@/src/lib/api";
import { getToken } from "@/src/lib/auth";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function ExportPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  async function doExport(kind: "latest" | "all") {
    setBusy(true);
    setError(null);
    try {
      const blob = await downloadCsv(kind);
      saveBlob(blob, kind === "latest" ? "latest_codes.csv" : "all_codes.csv");
    } catch (e: any) {
      setError(e?.message || "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
      <div
        className="card card-accent stack"
        style={{ maxWidth: 540, width: "100%", textAlign: "center" }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Export Data</h2>
          <div
            className="hint"
            style={{ marginTop: 6, maxWidth: 400, marginInline: "auto" }}
          >
            Analysis-ready CSV exports. <strong>Latest</strong> gives one row
            per paper; <strong>All</strong> includes every coding record in long
            format.
          </div>
        </div>
        {error ? (
          <div className="hint" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            className="btn btn-primary"
            onClick={() => doExport("latest")}
            disabled={busy}
          >
            {busy ? "Exporting..." : "Latest codes"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => doExport("all")}
            disabled={busy}
          >
            {busy ? "Exporting..." : "All codes"}
          </button>
        </div>
      </div>
    </div>
  );
}
