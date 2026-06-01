"""
main.py
-------
FastAPI application for OncoPipeline Intelligence.

Startup:
  uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger("oncopipeline.main")

_HERE = Path(__file__).parent
VITE_DIST = _HERE.parent / "frontend-v2" / "dist"
FRONTEND_DIR = VITE_DIST if VITE_DIST.exists() else _HERE.parent / "frontend"

# ── services (loaded at startup) ─────────────────────────────────────────────
from data_loader import DataLoader
from query_engine import QueryEngine
from ai_service   import get_pipeline_insight, chat as groq_chat, get_chart_insight
from pubmed_service import get_articles

loader: DataLoader  = DataLoader()
engine: QueryEngine


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    t0 = time.time()
    loader.load()
    engine = QueryEngine(loader)
    logger.info("Startup complete in %.1fs", time.time() - t0)
    yield


app = FastAPI(
    title="OncoPipeline Intelligence API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── helpers ───────────────────────────────────────────────────────────────────

def _require_cancer(cancer: Optional[str]) -> list[str]:
    if not cancer:
        valid = loader.cancer_list[:5]
        raise HTTPException(400, f"Unknown cancer. Examples: {valid}")
        
    cancers = [c.strip() for c in cancer.split(",")]
    if "All Cancers" in cancers or "All Oncology" in cancers:
        return ["All Cancers"]
        
    for c in cancers:
        if c not in loader.cancer_list:
            valid = loader.cancer_list[:5]
            raise HTTPException(400, f"Unknown cancer: {c}. Examples: {valid}")
    return cancers


def _get_filters(
    phase: Optional[str] = Query(None),
    sponsor_class: Optional[str] = Query(None),
    study_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    line_of_therapy: Optional[str] = Query(None),
    is_combination: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    start_year: Optional[int] = Query(None),
    end_year: Optional[int] = Query(None)
):
    return {
        "phase": phase,
        "sponsor_class": sponsor_class,
        "study_type": study_type,
        "status": status,
        "line_of_therapy": line_of_therapy,
        "is_combination": is_combination,
        "country": country,
        "start_year": start_year,
        "end_year": end_year
    }

# ── API routes ────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {
        "status":   "ok",
        "cancers":  len(loader.cancer_list),
        "trials":   123526,
    }

@app.get("/api/cancers")
def cancers():
    return {"cancers": loader.cancer_list}

_all_countries_cache = None
@app.get("/api/countries")
def get_all_countries():
    global _all_countries_cache
    if _all_countries_cache is None:
        c_set = set()
        if "countries" in loader.df.columns:
            for val in loader.df["countries"].dropna():
                for c in str(val).split("|"):
                    c = c.strip()
                    if c and c.lower() != "nan":
                        c_set.add(c)
        _all_countries_cache = sorted(list(c_set))
    return {"countries": _all_countries_cache}

@app.get("/api/hierarchy")
def hierarchy():
    return loader.cancer_hierarchy

@app.get("/api/summary")
def summary(cancer: str = Query(...), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return engine.summary(c, filters=filters)

@app.get("/api/funnel")
def funnel(cancer: str = Query(...), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"funnel": engine.funnel(c, filters=filters)}

@app.get("/api/drugs")
def drugs(cancer: str = Query(...), top_n: int = Query(15, ge=1, le=50), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"drugs": engine.top_drugs(c, top_n=top_n, filters=filters)}

@app.get("/api/sponsor-phases")
def sponsor_phases(cancer: str = Query(...), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"data": engine.sponsor_by_phase(c, filters=filters)}

@app.get("/api/geography")
def geography(cancer: str = Query(...), top_n: int = Query(30, ge=5, le=100), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"data": engine.geography(c, top_n=top_n, filters=filters)}

@app.get("/api/biomarkers")
def biomarkers(cancer: str = Query(...), top_n: int = Query(12, ge=5, le=30), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"data": engine.biomarkers(c, top_n=top_n, filters=filters)}

@app.get("/api/status")
def status(cancer: str = Query(...), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"data": engine.status_distribution(c, filters=filters)}

@app.get("/api/timeline")
def timeline(cancer: str = Query(...), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"data": engine.timeline(c, filters=filters)}

@app.get("/api/insight")
def insight(cancer: str = Query(...)):
    c = _require_cancer(cancer)
    ctx = engine.build_chat_context(c)
    cancer_label = ", ".join(c)
    text = get_pipeline_insight(cancer_label, ctx)
    return {"insight": text, "cancer": cancer_label}

class ChatRequest(BaseModel):
    question: str
    cancer:   str

@app.post("/api/chat")
def chat(req: ChatRequest):
    c = _require_cancer(req.cancer)
    ctx = engine.build_chat_context(c)
    cancer_label = ", ".join(c)
    answer = groq_chat(req.question, cancer_label, ctx)
    return {"answer": answer, "cancer": cancer_label}

class ChartInsightRequest(BaseModel):
    cancer: str
    chart_name: str
    data: list | dict

@app.post("/api/chart-insight")
def chart_insight(req: ChartInsightRequest):
    c = _require_cancer(req.cancer)
    cancer_label = ", ".join(c)
    insight_text = get_chart_insight(cancer_label, req.chart_name, req.data)
    return {"insight": insight_text, "chart_name": req.chart_name}

@app.get("/api/articles")
def articles(cancer: str = Query(...), query: Optional[str] = Query(None)):
    c = _require_cancer(cancer)
    cancer_label = c[0] if c else cancer
    arts = get_articles(cancer_label, user_query=query, max_results=3)
    return {"articles": arts, "cancer": cancer_label, "query": query}

@app.get("/api/biomarker-phase")
def biomarker_phase(cancer: str = Query(...), top_n: int = Query(10, ge=5, le=20), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"data": engine.biomarker_by_phase(c, top_n=top_n, filters=filters)}

@app.get("/api/drug-landscape")
def drug_landscape(cancer: str = Query(...), top_n: int = Query(20, ge=5, le=50), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"data": engine.drug_landscape(c, top_n=top_n, filters=filters)}

@app.get("/api/status-phase")
def status_phase(cancer: str = Query(...), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"data": engine.status_by_phase(c, filters=filters)}

@app.get("/api/drug-partners")
def drug_partners(cancer: str = Query(...), drug: str = Query(...), top_n: int = Query(10), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"data": engine.drug_partners(c, drug, top_n=top_n, filters=filters)}

@app.get("/api/top-sponsors-detailed")
def top_sponsors_detailed(cancer: str = Query(...), top_n: int = Query(20), filters: dict = Depends(_get_filters)):
    c = _require_cancer(cancer)
    return {"data": engine.top_sponsors_detailed(c, top_n=top_n, filters=filters)}

# ── serve frontend ────────────────────────────────────────────────────────────

@app.get("/")
def root():
    index = FRONTEND_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return JSONResponse({"error": "Frontend not found. Run from project root."}, status_code=404)

if FRONTEND_DIR.exists():
    if (FRONTEND_DIR / "css").exists():
        app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
    if (FRONTEND_DIR / "js").exists():
        app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")
    if (FRONTEND_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")
    else:
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR)), name="assets")

@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        return JSONResponse({"error": "Not found"}, status_code=404)
    index = FRONTEND_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return JSONResponse({"error": "Frontend not found. Build frontend-v2 first."}, status_code=404)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
