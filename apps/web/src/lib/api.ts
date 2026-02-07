import { getToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data?.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res;
}

export type Confidence = "high" | "medium" | "low";

export type PaperListItem = {
  id: string;
  doi?: string | null;
  title?: string | null;
  authors?: string | null;
  journal?: string | null;
  publication_year?: number | null;
  created_at: string;
  updated_at: string;
  coded: boolean;
};

export type PaperDetail = {
  id: string;
  doi?: string | null;
  title?: string | null;
  authors?: string | null;
  journal?: string | null;
  publication_year?: number | null;
  volume?: string | null;
  issue?: string | null;
  page_range?: string | null;
  corresponding_email?: string | null;
  abstract?: string | null;
  source?: string | null;
  created_at: string;
  updated_at: string;
  pdf_available: boolean;
  latest_code?: any | null;
};

export type UploadPdfResponse = {
  paper_id: string;
  extracted: Record<string, any>;
  confidence: Record<string, Confidence>;
};

export type CodeCreate = Record<string, any>;

export async function login(email: string, inviteCode?: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, invite_code: inviteCode || null }),
  });
  if (!res.ok) {
    let msg = `Login failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data?.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as { access_token: string; token_type: string };
}

export async function me() {
  const res = await apiFetch(`/auth/me`);
  return (await res.json()) as { id: string; email: string; role: string };
}

export async function listPapers(params: {
  q?: string;
  year?: string;
  coded?: string;
  journal?: string;
}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.year) qs.set("year", params.year);
  if (params.coded) qs.set("coded", params.coded);
  if (params.journal) qs.set("journal", params.journal);
  const res = await apiFetch(`/papers/?${qs.toString()}`);
  return (await res.json()) as PaperListItem[];
}

export async function getPaper(id: string) {
  const res = await apiFetch(`/papers/${id}`);
  return (await res.json()) as PaperDetail;
}

export async function updatePaper(id: string, patch: Record<string, any>) {
  const res = await apiFetch(`/papers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return (await res.json()) as PaperDetail;
}

export async function deletePaper(id: string) {
  await apiFetch(`/papers/${id}`, { method: "DELETE" });
}

export async function uploadPdf(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch(`/papers/upload-pdf`, {
    method: "POST",
    body: form,
  });
  return (await res.json()) as UploadPdfResponse;
}

export async function listCodes(paperId: string) {
  const res = await apiFetch(`/papers/${paperId}/codes`);
  return (await res.json()) as any[];
}

export async function createCode(paperId: string, code: CodeCreate) {
  const res = await apiFetch(`/papers/${paperId}/codes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(code),
  });
  return (await res.json()) as any;
}

export async function downloadCsv(kind: "latest" | "all") {
  const path = kind === "latest" ? "/export/latest.csv" : "/export/all.csv";
  const res = await apiFetch(path);
  return await res.blob();
}

