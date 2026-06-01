"""
pubmed_service.py
-----------------
Fetches recent PubMed literature through NCBI E-utilities.

This avoids the PubMed RSS page, which is convenient for browsers but brittle
inside deployed API services. E-utilities are free, official, and do not need an
API key for this demo volume.
"""

from __future__ import annotations

import hashlib
import html
import logging
import time
from datetime import datetime
from typing import Any

import requests

logger = logging.getLogger("oncopipeline.pubmed")

_CACHE: dict[str, tuple[float, list[dict]]] = {}
_CACHE_TTL = 3600

ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
ESUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"


def get_articles(cancer: str, user_query: str = None, max_results: int = 3) -> list[dict]:
    """Return recent PubMed articles for a cancer indication, optionally filtered by user_query."""
    cache_key = hashlib.md5(f"{cancer.lower()}:{user_query or ''}:{max_results}".encode()).hexdigest()
    cached = _CACHE.get(cache_key)
    if cached and time.time() - cached[0] < _CACHE_TTL:
        return cached[1]

    try:
        articles = _fetch_eutils(cancer, user_query=user_query, max_results=max_results)
        _CACHE[cache_key] = (time.time(), articles)
        return articles
    except Exception as exc:
        logger.warning("PubMed E-utilities fetch failed for '%s' (query: '%s'): %s", cancer, user_query, exc)
        return []


def _fetch_eutils(cancer: str, user_query: str = None, max_results: int = 3) -> list[dict]:
    ids = _search_ids(cancer, user_query=user_query, max_results=max_results + 3)
    if not ids:
        return []

    params = {
        "db": "pubmed",
        "id": ",".join(ids),
        "retmode": "json",
        "tool": "OncoPipeline",
        "email": "demo@example.com",
    }
    response = requests.get(
        ESUMMARY,
        params=params,
        timeout=12,
        headers={"User-Agent": "OncoPipeline/1.0"},
    )
    response.raise_for_status()
    payload = response.json().get("result", {})

    results = []
    for pmid in ids:
        item = payload.get(pmid)
        if not item:
            continue
        title = html.unescape(str(item.get("title", "")).strip())
        if not title:
            continue
        pubdate = str(item.get("pubdate", "")).strip()
        journal = str(item.get("source", "")).strip()
        authors = item.get("authors", []) or []
        first_author = authors[0].get("name", "") if authors else ""
        snippet_parts = [part for part in [journal, first_author, pubdate] if part]
        results.append({
            "title": title.rstrip("."),
            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            "snippet": " | ".join(snippet_parts) or "Recent PubMed-indexed oncology publication.",
            "date": _normalise_date(pubdate),
            "journal": journal,
            "source": "PubMed",
            "pmid": pmid,
        })
        if len(results) >= max_results:
            break
    return results


def _search_ids(cancer: str, user_query: str = None, max_results: int = 3) -> list[str]:
    query = f'("{cancer}"[Title/Abstract] OR "{cancer}"[MeSH Terms])'
    if user_query:
        query += f' AND ({user_query})'
    else:
        query += ' AND (oncology[Title/Abstract] OR cancer[Title/Abstract] OR trial[Title/Abstract] OR therapy[Title/Abstract] OR drug[Title/Abstract])'
    params = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": max_results,
        "sort": "pub date",
        "tool": "OncoPipeline",
        "email": "demo@example.com",
    }
    response = requests.get(
        ESEARCH,
        params=params,
        timeout=12,
        headers={"User-Agent": "OncoPipeline/1.0"},
    )
    response.raise_for_status()
    return response.json().get("esearchresult", {}).get("idlist", [])


def _normalise_date(value: str) -> str:
    for fmt in ("%Y %b %d", "%Y %b", "%Y"):
        try:
            parsed = datetime.strptime(value, fmt)
            if parsed > datetime.utcnow():
                return "Ahead of print"
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return value[:12]
