from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Literal

import fitz  # PyMuPDF
import httpx

from app.core.config import get_settings


Confidence = Literal["high", "medium", "low"]


DOI_RE = re.compile(r"10\.\d{4,9}\/[-._;()\/:A-Z0-9]+", re.IGNORECASE)
EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
YEAR_RE = re.compile(r"\b(19\d{2}|20\d{2})\b")


INSTITUTION_HINTS = (
    "university",
    "department",
    "school of",
    "faculty",
    "institute",
    "college",
    "centre",
    "center",
    "laboratory",
    "lab",
)


def extract_first_page_text(pdf_path: str) -> tuple[str, int]:
    doc = fitz.open(pdf_path)
    try:
        page_count = doc.page_count
        if page_count < 1:
            return "", page_count
        page = doc.load_page(0)
        return page.get_text("text") or "", page_count
    finally:
        doc.close()


def _clean_doi(raw: str) -> str:
    doi = raw.strip().rstrip(").,;")
    return doi.lower()


def parse_metadata_from_text(text: str) -> tuple[dict[str, Any], dict[str, Confidence]]:
    extracted: dict[str, Any] = {}
    confidence: dict[str, Confidence] = {}

    # DOI
    m = DOI_RE.search(text)
    if m:
        extracted["doi"] = _clean_doi(m.group(0))
        confidence["doi"] = "high"

    # Email
    em = EMAIL_RE.search(text)
    if em:
        extracted["corresponding_email"] = em.group(0).strip()
        confidence["corresponding_email"] = "high"

    # Year
    years = [int(y) for y in YEAR_RE.findall(text)]
    years = [y for y in years if 1900 <= y <= 2100]
    if years:
        extracted["publication_year"] = years[0]
        confidence["publication_year"] = "medium"

    # Title/authors heuristics using top-of-page lines before Abstract/Keywords
    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]

    cutoff = len(lines)
    for i, ln in enumerate(lines[:60]):
        if re.match(r"^(abstract|keywords)\b", ln, re.IGNORECASE):
            cutoff = i
            break
    top = lines[:cutoff]

    def looks_like_affiliation(s: str) -> bool:
        sl = s.lower()
        return any(h in sl for h in INSTITUTION_HINTS) or ("@" in sl)

    # Title candidate: longest non-affiliation-ish line group near the top
    title_candidates = []
    for ln in top[:25]:
        if DOI_RE.search(ln) or EMAIL_RE.search(ln):
            continue
        if looks_like_affiliation(ln):
            continue
        if len(ln) < 10:
            continue
        title_candidates.append(ln)

    if title_candidates:
        title = max(title_candidates, key=len)
        extracted["title"] = title
        confidence["title"] = "medium"

        # Authors: a few lines after title within top block
        try:
            idx = top.index(title)
        except ValueError:
            idx = 0
        author_block = top[idx + 1 : idx + 6]
        author_lines = []
        for ln in author_block:
            if looks_like_affiliation(ln):
                continue
            if any(ch.isdigit() for ch in ln):
                continue
            if len(ln) > 120:
                continue
            # basic signal: commas or " and "
            if "," in ln or " and " in ln.lower():
                author_lines.append(ln)
        if author_lines:
            extracted["authors"] = " ".join(author_lines)
            confidence["authors"] = "low"

    # Journal/volume/issue/pages: leave empty by default (often unreliable from first page)
    return extracted, confidence


def crossref_enrich(doi: str) -> tuple[dict[str, Any], dict[str, Any] | None]:
    settings = get_settings()
    params = {}
    if settings.crossref_mailto:
        params["mailto"] = settings.crossref_mailto
    url = f"https://api.crossref.org/works/{doi}"
    r = httpx.get(url, params=params, timeout=10.0, headers={"User-Agent": "sara-int/0.1 (mailto optional)"})
    if r.status_code != 200:
        return {}, None
    data = r.json()
    msg = data.get("message") or {}
    enriched: dict[str, Any] = {}

    title = (msg.get("title") or [None])[0]
    if title:
        enriched["title"] = title

    journal = (msg.get("container-title") or [None])[0]
    if journal:
        enriched["journal"] = journal

    issued = msg.get("issued", {}).get("date-parts")
    if issued and isinstance(issued, list) and issued and issued[0]:
        year = issued[0][0]
        if isinstance(year, int):
            enriched["publication_year"] = year

    authors = msg.get("author") or []
    if authors and isinstance(authors, list):
        parts = []
        for a in authors[:30]:
            given = a.get("given") or ""
            family = a.get("family") or ""
            name = (given + " " + family).strip()
            if name:
                parts.append(name)
        if parts:
            enriched["authors"] = ", ".join(parts)

    volume = msg.get("volume")
    issue = msg.get("issue")
    page = msg.get("page")
    if volume:
        enriched["volume"] = str(volume)
    if issue:
        enriched["issue"] = str(issue)
    if page:
        enriched["page_range"] = str(page)

    return enriched, msg


def _first_nonempty_str(*values: Any) -> str | None:
    for v in values:
        if v is None:
            continue
        if isinstance(v, str):
            s = v.strip()
            if s:
                return s
            continue
        # some APIs return {"content": "..."} or similar
        if isinstance(v, dict):
            for kk in ("content", "value", "text", "name", "full_name", "fullName", "displayName", "title"):
                vv = v.get(kk)
                if isinstance(vv, str) and vv.strip():
                    return vv.strip()
        # allow single-element lists of strings/dicts
        if isinstance(v, list) and v:
            s = _first_nonempty_str(v[0])
            if s:
                return s
    return None


def _deep_get(obj: Any, path: list[str]) -> Any:
    cur = obj
    for key in path:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(key)
    return cur


def _find_record_list(payload: Any) -> list[dict[str, Any]] | None:
    """
    Best-effort discovery of the 'records' list in Clarivate WoS Expanded JSON responses.
    We keep this heuristic conservative to avoid accidentally selecting author/name lists.
    """
    if isinstance(payload, list):
        if payload and all(isinstance(x, dict) for x in payload):
            # Heuristic: likely record objects contain one of these keys.
            if any(any(k in x for k in ("UID", "uid", "static_data", "staticData", "source", "title")) for x in payload):
                return payload  # type: ignore[return-value]
        return None

    if not isinstance(payload, dict):
        return None

    # Common container keys (try in a stable order)
    for key in ("Data", "data", "Records", "records", "REC", "hits", "Items", "items"):
        v = payload.get(key)
        found = _find_record_list(v)
        if found:
            return found

    # Walk children
    for v in payload.values():
        found = _find_record_list(v)
        if found:
            return found

    return None


def _parse_clarivate_record(record: dict[str, Any]) -> dict[str, Any]:
    enriched: dict[str, Any] = {}

    # Title
    title = None
    titles = _deep_get(record, ["static_data", "summary", "titles", "title"])
    if isinstance(titles, list):
        item = None
        for t in titles:
            if isinstance(t, dict) and str(t.get("type") or "").lower() in ("item", "source", "title"):
                item = t
                break
        title = _first_nonempty_str(item or (titles[0] if titles else None))
    title = title or _first_nonempty_str(
        record.get("title"),
        _deep_get(record, ["static_data", "summary", "title"]),
        _deep_get(record, ["staticData", "summary", "titles", "title"]),
    )
    if title:
        enriched["title"] = title

    # Authors
    names = _deep_get(record, ["static_data", "summary", "names", "name"])
    if isinstance(names, list):
        parts: list[str] = []
        for n in names[:50]:
            s = _first_nonempty_str(n)
            if s:
                parts.append(s)
        if parts:
            enriched["authors"] = ", ".join(parts)
    else:
        # fallback shapes
        authors = record.get("authors")
        if isinstance(authors, list):
            parts = []
            for a in authors[:50]:
                s = _first_nonempty_str(a)
                if s:
                    parts.append(s)
            if parts:
                enriched["authors"] = ", ".join(parts)

    # Journal + pub info
    pub_info = (
        _deep_get(record, ["static_data", "summary", "pub_info"])
        or _deep_get(record, ["staticData", "summary", "pub_info"])
        or _deep_get(record, ["static_data", "summary", "pubInfo"])
        or _deep_get(record, ["staticData", "summary", "pubInfo"])
    )
    if isinstance(pub_info, dict):
        journal = _first_nonempty_str(
            pub_info.get("journal_title"),
            pub_info.get("source_title"),
            pub_info.get("sourceTitle"),
            pub_info.get("title"),
        )
        if journal:
            enriched["journal"] = journal

        year = pub_info.get("pubyear") or pub_info.get("pubYear") or pub_info.get("year")
        if isinstance(year, str) and year.isdigit():
            enriched["publication_year"] = int(year)
        elif isinstance(year, int):
            enriched["publication_year"] = year

        volume = _first_nonempty_str(pub_info.get("vol"), pub_info.get("volume"))
        issue = _first_nonempty_str(pub_info.get("issue"))
        pages = _first_nonempty_str(pub_info.get("page"), pub_info.get("pages"))
        if volume:
            enriched["volume"] = volume
        if issue:
            enriched["issue"] = issue
        if pages:
            enriched["page_range"] = pages

    # Abstract (SR may not include this; best-effort)
    abstract = _first_nonempty_str(
        record.get("abstract"),
        _deep_get(record, ["static_data", "fullrecord_metadata", "abstracts", "abstract", "p"]),
        _deep_get(record, ["static_data", "fullrecord_metadata", "abstracts", "abstract"]),
    )
    if abstract:
        enriched["abstract"] = abstract

    return enriched


def clarivate_enrich(doi: str) -> tuple[dict[str, Any], dict[str, Any] | None]:
    settings = get_settings()
    if not settings.clarivate_api_key:
        return {}, None

    base_url = (settings.clarivate_wos_base_url or "").rstrip("/")
    if not base_url:
        return {}, None

    url = base_url
    params = {
        "databaseId": "WOS",
        "optionView": "SR",
        "usrQuery": f"DO=({doi})",
        "count": 1,
        "firstRecord": 1,
    }
    headers = {
        "X-ApiKey": settings.clarivate_api_key,
        "Accept": "application/json",
    }

    r = httpx.get(url, params=params, headers=headers, timeout=settings.clarivate_timeout_seconds)
    if r.status_code != 200:
        return {}, None

    data = r.json()
    records = _find_record_list(data)
    if not records:
        return {}, data if isinstance(data, dict) else {"raw": data}

    record = records[0]
    enriched = _parse_clarivate_record(record)
    return enriched, data if isinstance(data, dict) else {"raw": data}


def apply_enrichment(
    extracted: dict[str, Any],
    confidence: dict[str, Confidence],
    doi: str,
) -> tuple[
    dict[str, Any],
    dict[str, Confidence],
    bool,
    dict[str, Any] | None,
    bool,
    dict[str, Any] | None,
]:
    crossref_used = False
    crossref_raw: dict[str, Any] | None = None
    clarivate_used = False
    clarivate_raw: dict[str, Any] | None = None

    def can_override(key: str) -> bool:
        """
        Allow enrichment APIs (Crossref/Clarivate) to override heuristic extraction
        when the current value is missing or low/medium confidence.
        """
        if not extracted.get(key):
            return True
        # If we didn't set confidence for a field, treat it as low (heuristic/unknown).
        cur = confidence.get(key) or "low"
        return cur in ("low", "medium")

    # Crossref first
    enriched, raw = crossref_enrich(doi)
    crossref_raw = raw
    if enriched:
        crossref_used = True
        # Prefer Crossref over low/medium-confidence heuristic fields.
        for k, v in enriched.items():
            if v and can_override(k):
                extracted[k] = v
                confidence[k] = "high"

    # Clarivate second (prefer over remaining low/medium-confidence fields)
    enriched, raw = clarivate_enrich(doi)
    clarivate_raw = raw
    if enriched:
        clarivate_used = True
        for k, v in enriched.items():
            if v and can_override(k):
                extracted[k] = v
                confidence[k] = "high"

    return extracted, confidence, crossref_used, crossref_raw, clarivate_used, clarivate_raw


@dataclass(frozen=True)
class ExtractionResult:
    extracted: dict[str, Any]
    confidence: dict[str, Confidence]
    raw_first_page_text: str
    crossref_used: bool
    crossref_raw: dict[str, Any] | None
    clarivate_used: bool
    clarivate_raw: dict[str, Any] | None


def run_extraction(pdf_path: str) -> ExtractionResult:
    raw_text, _page_count = extract_first_page_text(pdf_path)
    extracted, confidence = parse_metadata_from_text(raw_text)

    crossref_used = False
    crossref_raw: dict[str, Any] | None = None
    clarivate_used = False
    clarivate_raw: dict[str, Any] | None = None
    doi = extracted.get("doi")
    if doi:
        try:
            extracted, confidence, crossref_used, crossref_raw, clarivate_used, clarivate_raw = apply_enrichment(
                extracted, confidence, doi
            )
        except Exception:
            # Enrichment is optional; never fail ingestion if it errors.
            crossref_used = False
            crossref_raw = None
            clarivate_used = False
            clarivate_raw = None

    # Ensure JSON-serializable for storage
    json.dumps(extracted)
    json.dumps(confidence)
    if clarivate_raw is not None:
        json.dumps(clarivate_raw)

    return ExtractionResult(
        extracted=extracted,
        confidence=confidence,
        raw_first_page_text=raw_text,
        crossref_used=crossref_used,
        crossref_raw=crossref_raw,
        clarivate_used=clarivate_used,
        clarivate_raw=clarivate_raw,
    )

