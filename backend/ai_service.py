"""
ai_service.py
-------------
Groq API integration for:
  1. Pipeline insight summary (auto-generated per cancer)
  2. Chatbot (Q&A with context from the filtered dashboard data)

Caches Groq responses for GROQ_CACHE_TTL seconds to avoid repeated API calls.
If GROQ_API_KEY is not set, returns graceful fallback messages.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from typing import Any

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("oncopipeline.ai")

_GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
_GROQ_MODEL    = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
_CACHE_TTL     = int(os.getenv("GROQ_CACHE_TTL", "600"))

# Simple in-process TTL cache
_cache: dict[str, tuple[float, str]] = {}


def _get_client():
    if not _GROQ_API_KEY:
        return None
    try:
        from groq import Groq
        return Groq(api_key=_GROQ_API_KEY)
    except ImportError:
        logger.warning("groq package not installed — AI features disabled")
        return None


def _cache_get(key: str) -> str | None:
    if key in _cache:
        ts, val = _cache[key]
        if time.time() - ts < _CACHE_TTL:
            return val
        del _cache[key]
    return None


def _cache_set(key: str, val: str) -> None:
    _cache[key] = (time.time(), val)


def _make_key(*args) -> str:
    raw = json.dumps(args, sort_keys=True)
    return hashlib.md5(raw.encode()).hexdigest()


# ── Pipeline Insight ─────────────────────────────────────────────────────────

INSIGHT_SYSTEM = """You are a senior oncology pipeline intelligence analyst at a pharma strategy consultancy.
You synthesize clinical trial data into sharp, executive-level insights.
Rules:
- Write exactly 3 sentences.
- Every sentence must reference specific numbers from the data.
- Use clinical language: "pipeline", "asset", "attrition", "late-stage", "bottleneck".
- Do NOT use marketing language or adjectives like "promising", "exciting".
- Format: plain prose, no bullet points, no headers.
"""

def get_pipeline_insight(cancer: str, context: dict) -> str:
    key = _make_key("insight", cancer, context.get("total_trials"))
    cached = _cache_get(key)
    if cached:
        return cached

    client = _get_client()
    if not client:
        return _fallback_insight(cancer, context)

    funnel_str = " → ".join(
        f"{r['phase']}: {r['trials']:,} trials, {r['drugs']:,} drugs"
        for r in context.get("funnel", []) if r.get("trials", 0) > 0
    )
    top_drugs_str = ", ".join(context.get("top_drugs", [])[:5])

    user_msg = f"""
Cancer: {cancer}
Total trials: {context.get('total_trials', 0):,}
Interventional trials: {context.get('interventional_trials', 0):,}
Distinct drug assets: {context.get('distinct_drugs', 0):,}
Total targeted patients: {context.get('total_patients', 0):,}
Countries: {context.get('countries', 0)}
Phase funnel: {funnel_str}
Top assets by trial count: {top_drugs_str}

Write a 3-sentence pipeline intelligence summary for a pharma strategy director reviewing this data.
"""
    try:
        resp = client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=[
                {"role": "system", "content": INSIGHT_SYSTEM},
                {"role": "user",   "content": user_msg},
            ],
            max_tokens=300,
            temperature=0.4,
        )
        result = resp.choices[0].message.content.strip()
        _cache_set(key, result)
        return result
    except Exception as e:
        logger.error("Groq insight error: %s", e)
        return _fallback_insight(cancer, context)


def _fallback_insight(cancer: str, ctx: dict) -> str:
    trials  = ctx.get("total_trials", 0)
    drugs   = ctx.get("distinct_drugs", 0)
    funnel  = ctx.get("funnel", [])
    p3 = next((r for r in funnel if r.get("phase") == "Phase 3"), None)
    p3_trials = p3.get("trials", 0) if p3 else 0
    return (
        f"The {cancer} pipeline spans {trials:,} clinical trials across {ctx.get('countries', 0)} countries, "
        f"with {drugs:,} distinct investigational assets in active development. "
        f"Phase 3 activity comprises {p3_trials:,} trials, representing the late-stage validation stage. "
        f"Connect your Groq API key to enable AI-generated strategic insights."
    )

def get_chart_insight(cancer: str, chart_name: str, data: Any) -> str:
    key = _make_key("chart_insight", cancer, chart_name, str(data)[:500])
    cached = _cache_get(key)
    if cached: return cached

    client = _get_client()
    if not client:
        return f"AI summary unavailable for {chart_name} (No API key). Data shows {len(data) if isinstance(data, list) else 0} data points."

    user_msg = f"""
Cancer Indication: {cancer}
Chart: {chart_name}
Data Points (JSON snippet):
{json.dumps(data)[:1500]}

Write a 2-3 sentence strategic explanation of what this specific chart data means for a pharmaceutical competitor (like Pfizer) researching this area. Do not use marketing jargon or introductory phrases like 'This chart shows'. Keep it factual and analytical.
"""
    try:
        resp = client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a clinical intelligence analyst."},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=150,
            temperature=0.3,
        )
        res = resp.choices[0].message.content.strip()
        _cache_set(key, res)
        return res
    except Exception as e:
        logger.error("Groq chart insight error: %s", e)
        return "Unable to generate summary at this time."

# ── Chatbot ───────────────────────────────────────────────────────────────────

CHAT_SYSTEM = """You are an expert oncology clinical intelligence analyst and medical strategy consultant.
You are assisting a pharma strategy director reviewing clinical trial data for specific cancers.
You have access to a brief dashboard data context below, but you SHOULD use your extensive medical and pharmaceutical knowledge to explain concepts, drug mechanisms, combination strategies, and clinical trends.
Rules:
- Answer in a clear, professional, and insightful manner.
- Cite specific numbers from the data context if relevant to the question.
- If the dashboard context does not have the specific data the user asks about (e.g., a specific chart's data), use your broad oncology knowledge to explain what is typically seen, or explain the scientific rationale behind things like drug combination strategies for that cancer.
- NEVER say "I don't have access to the data" or "I am limited to the provided context" or "I cannot search the web". Always provide a helpful, intelligent answer based on your AI training.
- Do NOT use markdown formatting like bolding or bullet points, just use clean paragraphs.
"""

def chat(question: str, cancer: str, context: dict) -> str:
    """Answer a stakeholder question using Groq with the current dashboard data as context."""
    client = _get_client()
    if not client:
        return (
            "AI chat is not available — please add your Groq API key to the .env file. "
            "Get a free key at console.groq.com."
        )

    context_str = _format_context(cancer, context)

    try:
        resp = client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=[
                {"role": "system",    "content": CHAT_SYSTEM},
                {"role": "user",      "content": f"DATA CONTEXT:\n{context_str}\n\nQUESTION: {question}"},
            ],
            max_tokens=400,
            temperature=0.5,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Groq chat error: %s", e)
        return f"Unable to generate a response at this time. Please try again shortly."


def _format_context(cancer: str, ctx: dict) -> str:
    funnel_lines = "\n".join(
        f"  {r['phase']}: {r.get('trials',0):,} trials | {r.get('drugs',0):,} drugs | "
        f"{r.get('patients',0):,} patients"
        + (f" | ↓{r['attrition_pct']}% drug attrition from previous phase" if r.get('attrition_pct') else "")
        for r in ctx.get("funnel", [])
    )
    top_drugs = ", ".join(ctx.get("top_drugs", []))
    top_countries = ", ".join(ctx.get("top_countries", []))

    return f"""Cancer Indication: {cancer}
Total Trials: {ctx.get('total_trials', 0):,}
Interventional Trials: {ctx.get('interventional_trials', 0):,}
Distinct Drug Assets: {ctx.get('distinct_drugs', 0):,}
Total Targeted Patients: {ctx.get('total_patients', 0):,}
Countries Represented: {ctx.get('countries', 0)}

Phase Development Funnel (interventional trials):
{funnel_lines}

Top Drug Assets by Trial Count: {top_drugs}
Most Active Countries: {top_countries}"""
