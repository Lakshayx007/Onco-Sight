"""
query_engine.py
---------------
All data query / aggregation logic. Operates on in-memory DataFrames
loaded by DataLoader. Every function returns a plain Python dict/list
ready for JSON serialisation.
"""

from __future__ import annotations

from collections import Counter
import re
from typing import Any

import numpy as np
import pandas as pd

from data_loader import DataLoader, PHASE_ORDER, parse_pipe

PHASE_COLORS = {
    "Early Phase 1": "#4ECDC4",
    "Phase 1":       "#00D4AA",
    "Phase 2":       "#3B82F6",
    "Phase 3":       "#8B5CF6",
    "Phase 4":       "#F59E0B",
}

SPONSOR_CLASS_LABELS = {
    "INDUSTRY":  "Industry",
    "NIH":       "NIH / Federal",
    "OTHER_GOV": "Other Gov",
    "INDIV":     "Individual",
    "NETWORK":   "Network",
    "AMBIG":     "Ambiguous",
    "OTHER":     "Other / Academic",
    "FED":       "Federal",
    "UNKNOWN":   "Unknown",
}

FILTER_COLS = ["nct_id", "phase_buckets", "lead_sponsor_class", "study_type", "overall_status", "line_of_therapy", "is_combination", "countries", "first_posted_date"]



class QueryEngine:
    def __init__(self, loader: DataLoader):
        self.loader = loader

    # ── summary KPIs ────────────────────────────────────────────────────────

    def summary(self, cancer: str, filters: dict | None = None) -> dict:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS + ["enrollment_count"])
        df_dp = _valid_drug_phase(self.loader.get_cancer_drug_phase(cancer, columns=["nct_id", "drug_name", "phase_bucket"]))
        df, df_dp = self.apply_filters(df, df_dp, filters)
        interventional = df[df["study_type"] == "INTERVENTIONAL"]
        return {
            "total_trials":         int(df["nct_id"].nunique()),
            "interventional_trials": int(interventional["nct_id"].nunique()),
            "distinct_drugs":       int(df_dp["drug_name"].nunique()) if not df_dp.empty else 0,
            "total_patients":       int(interventional["enrollment_count"].fillna(0).sum()),
            "countries":            int(len(_explode_pipe(df["countries"]))),
        }

    # ── phase funnel ─────────────────────────────────────────────────────────

    def funnel(self, cancer: str, filters: dict | None = None) -> list[dict]:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS + ["enrollment_count"])
        df_dp = _valid_drug_phase(self.loader.get_cancer_drug_phase(cancer, columns=["nct_id", "drug_name", "phase_bucket"]))
        df, df_dp = self.apply_filters(df, df_dp, filters)

        rows = []
        prev_drugs = None
        for phase in PHASE_ORDER:
            phase_trials = df[df["phase_buckets_list"].map(lambda v: phase in v)]
            phase_dp = df_dp[df_dp["phase_bucket"] == phase] if not df_dp.empty else pd.DataFrame()

            trial_count  = int(phase_trials["nct_id"].nunique())
            drug_count   = int(phase_dp["drug_name"].nunique()) if not phase_dp.empty else 0
            enrollment   = int(phase_trials["enrollment_count"].fillna(0).sum())

            attrition_pct = None
            if prev_drugs is not None and prev_drugs > 0 and drug_count > 0:
                attrition_pct = round((prev_drugs - drug_count) / prev_drugs * 100, 1)

            rows.append({
                "phase":          phase,
                "color":          PHASE_COLORS[phase],
                "unique_trials":  trial_count,
                "distinct_drugs": drug_count,
                "total_enrollment": enrollment,
                "attrition_pct":  attrition_pct,
                "stage_delta_pct": attrition_pct,
            })
            prev_drugs = drug_count

        return rows

    # ── drug intelligence table ───────────────────────────────────────────────

    def top_drugs(self, cancer: str, top_n: int = 15, filters: dict | None = None) -> list[dict]:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS + ["enrollment_count"])
        df_dp = _valid_drug_phase(self.loader.get_cancer_drug_phase(cancer, columns=["nct_id", "drug_name", "phase_bucket"]))
        df, df_dp = self.apply_filters(df, df_dp, filters)

        if df_dp is None or df_dp.empty:
            return []

        # aggregate per drug
        agg = (df_dp.groupby("drug_name")
                   .agg(trial_count=("nct_id", "nunique"),
                        phases=("phase_bucket", lambda x: sorted([str(p) for p in x.unique() if pd.notna(p)])))
                   .reset_index()
                   .sort_values("trial_count", ascending=False)
                   .head(top_n))

        # enrich with enrollment and sponsor from main df
        nct_by_drug = df_dp.groupby("drug_name")["nct_id"].apply(set).to_dict()
        result = []
        for _, row in agg.iterrows():
            nct_ids = nct_by_drug.get(row["drug_name"], set())
            sub = df[df["nct_id"].isin(nct_ids)]
            enrollment = int(sub["enrollment_count"].fillna(0).sum())
            sponsor_classes = list(sub["lead_sponsor_class"].dropna().unique())
            dominant_phase = row["phases"][0] if row["phases"] else "Unknown"
            result.append({
                "drug_name":      row["drug_name"],
                "trial_count":    int(row["trial_count"]),
                "phases":         row["phases"],
                "dominant_phase": dominant_phase,
                "phase_color":    PHASE_COLORS.get(dominant_phase, "#94A3B8"),
                "total_enrollment": enrollment,
                "sponsor_classes":  sponsor_classes,
            })
        return result

    # ── sponsor analysis (per phase) ──────────────────────────────────────────

    def sponsor_by_phase(self, cancer: str, filters: dict | None = None) -> list[dict]:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS)
        df, _ = self.apply_filters(df, None, filters)
        if df.empty:
            return []
        rows = []
        for phase in PHASE_ORDER:
            phase_df = df[df["phase_buckets_list"].map(lambda v: phase in v)]
            if phase_df.empty:
                continue
            counts = phase_df["lead_sponsor_class"].fillna("UNKNOWN").value_counts().to_dict()
            row = {"phase": phase}
            for raw, label in SPONSOR_CLASS_LABELS.items():
                row[label] = int(counts.get(raw, 0))
            rows.append(row)
        return rows

    # ── geography ─────────────────────────────────────────────────────────────

    def geography(self, cancer: str, top_n: int = 30, filters: dict | None = None) -> list[dict]:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS)
        df, _ = self.apply_filters(df, None, filters)
        if df.empty:
            return []
        counts = Counter()
        for val in df["countries"].fillna(""):
            for country in parse_pipe(val):
                if country:
                    counts[country] += 1
        return [{"country": c, "trial_count": n}
                for c, n in counts.most_common(top_n)]

    # ── biomarkers / mutations ────────────────────────────────────────────────

    def biomarkers(self, cancer: str, top_n: int = 12, filters: dict | None = None) -> list[dict]:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS + ["biomarkers_all", "mutations_all"])
        df, _ = self.apply_filters(df, None, filters)
        col = "biomarkers_all" if "biomarkers_all" in df.columns else None
        mut_col = "mutations_all" if "mutations_all" in df.columns else None

        counts: Counter = Counter()
        if col:
            for val in df[col].fillna(""):
                for b in parse_pipe(val):
                    if b:
                        counts[b] += 1
        if mut_col:
            for val in df[mut_col].fillna(""):
                for m in parse_pipe(val):
                    if m:
                        counts[m] += 1

        return [{"biomarker": b, "trial_count": n}
                for b, n in counts.most_common(top_n)]

    # ── trial status distribution ─────────────────────────────────────────────

    def status_distribution(self, cancer: str, filters: dict | None = None) -> list[dict]:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS)
        df, _ = self.apply_filters(df, None, filters)
        df = df[~df['overall_status'].fillna('').str.contains('Unknown', case=False)]
        if df.empty:
            return []
        counts = df["overall_status"].fillna("UNKNOWN").value_counts().to_dict()
        STATUS_COLORS = {
            "RECRUITING":            "#00D4AA",
            "ACTIVE_NOT_RECRUITING": "#3B82F6",
            "COMPLETED":             "#94A3B8",
            "NOT_YET_RECRUITING":    "#F59E0B",
            "TERMINATED":            "#F43F5E",
            "WITHDRAWN":             "#BE123C",
            "SUSPENDED":             "#EF4444",
            "ENROLLING_BY_INVITATION": "#8B5CF6",
            "UNKNOWN":               "#475569",
        }
        return [{"status": s, "count": int(n),
                 "color": STATUS_COLORS.get(s, "#475569")}
                for s, n in sorted(counts.items(), key=lambda x: -x[1])]

    # ── timeline (new trials per year) ────────────────────────────────────────

    def timeline(self, cancer: str, filters: dict | None = None) -> list[dict]:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS)
        df, _ = self.apply_filters(df, None, filters)
        if df.empty or "first_posted_date" not in df.columns:
            return []
        df = df.dropna(subset=["first_posted_date"]).copy()
        df["year"] = df["first_posted_date"].dt.year
        # only reasonable years
        df = df[(df["year"] >= 2000) & (df["year"] <= 2026)]
        by_year_phase = (df.explode("phase_buckets_list")
                           .groupby(["year", "phase_buckets_list"])["nct_id"]
                           .nunique()
                           .reset_index()
                           .rename(columns={"nct_id": "count", "phase_buckets_list": "phase"}))
        rows = []
        for year, grp in by_year_phase.groupby("year"):
            row = {"year": int(year)}
            for _, r in grp.iterrows():
                if r["phase"] in PHASE_ORDER:
                    row[r["phase"]] = int(r["count"])
            rows.append(row)
        return sorted(rows, key=lambda r: r["year"])

    # ── chat context builder ──────────────────────────────────────────────────

    def build_chat_context(self, cancer: str) -> dict:
        """Compact summary dict sent to Groq as context."""
        summary = self.summary(cancer)
        funnel  = self.funnel(cancer, filters={"study_type": "INTERVENTIONAL"})
        drugs   = self.top_drugs(cancer, top_n=8)
        geo     = self.geography(cancer, top_n=5)
        return {
            "cancer":               cancer,
            "total_trials":         summary["total_trials"],
            "interventional_trials": summary["interventional_trials"],
            "distinct_drugs":        summary["distinct_drugs"],
            "total_patients":        summary["total_patients"],
            "countries":             summary["countries"],
            "funnel": [
                {
                    "phase":   r["phase"],
                    "trials":  r["unique_trials"],
                    "drugs":   r["distinct_drugs"],
                    "patients": r["total_enrollment"],
                    "attrition_pct": r["attrition_pct"],
                }
                for r in funnel
            ],
            "top_drugs": [f"{d['drug_name']} ({d['trial_count']} trials)" for d in drugs],
            "top_countries": [f"{g['country']} ({g['trial_count']})" for g in geo],
        }

    # ── generic filter helper ─────────────────────────────────────────────────

    def apply_filters(self, df: pd.DataFrame, df_dp: pd.DataFrame | None = None,
                      filters: dict | None = None) -> tuple[pd.DataFrame, pd.DataFrame | None]:
        if not filters:
            return df, df_dp

        if "phase" in filters and filters["phase"]:
            phase = filters["phase"]
            df = df[df["phase_buckets_list"].map(lambda v: phase in v)]
            if df_dp is not None and not df_dp.empty:
                df_dp = df_dp[df_dp["phase_bucket"] == phase]

        if "sponsor_class" in filters and filters["sponsor_class"]:
            df = df[df["lead_sponsor_class"] == filters["sponsor_class"]]
            if df_dp is not None and not df_dp.empty:
                df_dp = df_dp[df_dp["nct_id"].isin(df["nct_id"])]

        if "study_type" in filters and filters["study_type"]:
            df = df[df["study_type"] == filters["study_type"]]
            if df_dp is not None and not df_dp.empty:
                df_dp = df_dp[df_dp["nct_id"].isin(df["nct_id"])]

        if "status" in filters and filters["status"]:
            df = df[df["overall_status"] == filters["status"]]
            if df_dp is not None and not df_dp.empty:
                df_dp = df_dp[df_dp["nct_id"].isin(df["nct_id"])]

        if "line_of_therapy" in filters and filters["line_of_therapy"]:
            if "line_of_therapy" in df.columns:
                df = df[df["line_of_therapy"] == filters["line_of_therapy"]]
                if df_dp is not None and not df_dp.empty:
                    df_dp = df_dp[df_dp["nct_id"].isin(df["nct_id"])]

        if "is_combination" in filters and filters["is_combination"] is not None:
            if "is_combination" in df.columns:
                df = df[df["is_combination"] == filters["is_combination"]]
                if df_dp is not None and not df_dp.empty:
                    df_dp = df_dp[df_dp["nct_id"].isin(df["nct_id"])]

        if "country" in filters and filters["country"]:
            country = filters["country"]
            if "countries" in df.columns:
                # the countries column has pipe-separated names
                df = df[df["countries"].fillna("").map(lambda x: country in parse_pipe(x))]
                if df_dp is not None and not df_dp.empty:
                    df_dp = df_dp[df_dp["nct_id"].isin(df["nct_id"])]

        if "start_year" in filters and filters["start_year"]:
            try:
                sy = int(filters["start_year"])
                df = df[df["first_posted_date"].dt.year >= sy]
                if df_dp is not None and not df_dp.empty:
                    df_dp = df_dp[df_dp["nct_id"].isin(df["nct_id"])]
            except: pass

        if "end_year" in filters and filters["end_year"]:
            try:
                ey = int(filters["end_year"])
                df = df[df["first_posted_date"].dt.year <= ey]
                if df_dp is not None and not df_dp.empty:
                    df_dp = df_dp[df_dp["nct_id"].isin(df["nct_id"])]
            except: pass

        return df, df_dp

    # ── biomarker × phase heatmap ─────────────────────────────────────────────

    def biomarker_by_phase(self, cancer: str, top_n: int = 10, filters: dict | None = None) -> list[dict]:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS + ["biomarkers_all", "mutations_all"])
        df, _ = self.apply_filters(df, None, filters)
        if df.empty:
            return []

        counts: Counter = Counter()
        for col in ("biomarkers_all", "mutations_all"):
            if col not in df.columns:
                continue
            for val in df[col].fillna(""):
                for b in parse_pipe(val):
                    if b:
                        counts[b] += 1

        top_biomarkers = [b for b, _ in counts.most_common(top_n)]
        if not top_biomarkers:
            return []

        rows = []
        for biomarker in top_biomarkers:
            for phase in PHASE_ORDER:
                mask_phase = df["phase_buckets_list"].map(lambda v, p=phase: p in v)
                mask_bio = pd.Series(False, index=df.index)
                for col in ("biomarkers_all", "mutations_all"):
                    if col in df.columns:
                        mask_bio = mask_bio | df[col].fillna("").map(
                            lambda value, b=biomarker: b.lower() in {
                                item.lower() for item in parse_pipe(str(value))
                            }
                        )
                count = int((mask_phase & mask_bio).sum())
                rows.append({"biomarker": biomarker, "phase": phase, "count": count})
        return rows

    # ── drug landscape (bubble scatter) ───────────────────────────────────────

    def drug_landscape(self, cancer: str, top_n: int = 20, filters: dict | None = None) -> list[dict]:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS + ["enrollment_count"])
        df_dp = _valid_drug_phase(self.loader.get_cancer_drug_phase(cancer, columns=["nct_id", "drug_name", "phase_bucket"]))
        df, df_dp = self.apply_filters(df, df_dp, filters)
        
        if df_dp is None or df_dp.empty:
            return []

        enrollment_map = df.set_index("nct_id")["enrollment_count"].fillna(0).to_dict()

        agg = (df_dp.groupby("drug_name")
                   .agg(unique_trials=("nct_id", "nunique"),
                        phases_covered=("phase_bucket", "nunique"))
                   .reset_index()
                   .sort_values("unique_trials", ascending=False)
                   .head(top_n))

        nct_by_drug = df_dp.groupby("drug_name")["nct_id"].apply(set).to_dict()
        rows = []
        for _, row in agg.iterrows():
            nct_ids = nct_by_drug.get(row["drug_name"], set())
            total_enrollment = int(sum(enrollment_map.get(nid, 0) for nid in nct_ids))
            rows.append({
                "drug_name":        row["drug_name"],
                "unique_trials":    int(row["unique_trials"]),
                "phases_covered":   int(row["phases_covered"]),
                "total_enrollment": total_enrollment,
            })
        return rows

    # ── status × phase heatmap ────────────────────────────────────────────────

    def status_by_phase(self, cancer: str, filters: dict | None = None) -> list[dict]:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS)
        df, _ = self.apply_filters(df, None, filters)
        if df.empty:
            return []

        rows = []
        for phase in PHASE_ORDER:
            phase_df = df[df["phase_buckets_list"].map(lambda v, p=phase: p in v)]
            if phase_df.empty:
                continue
            counts = phase_df["overall_status"].fillna("UNKNOWN").value_counts()
            for status, count in counts.items():
                rows.append({"status": status, "phase": phase, "count": int(count)})
        return rows

    def top_sponsors_detailed(self, cancer: str, top_n: int = 15, filters: dict | None = None) -> list[dict]:
        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS + ["collaborators"])
        df, _ = self.apply_filters(df, None, filters)
        if df.empty or "collaborators" not in df.columns:
            return []
            
        counts = Counter()
        for sponsors in df["collaborators"].dropna():
            for s in parse_pipe(str(sponsors)):
                if s and len(s) > 2:
                    counts[s] += 1
                    
        return [{"sponsor": k, "count": v} for k, v in counts.most_common(top_n)]

    # ── drug combination partners ─────────────────────────────────────────────

    def drug_partners(self, cancer: str, drug_name: str, top_n: int = 10, filters: dict | None = None) -> dict:
        if not _is_valid_asset_name(drug_name):
            return {"partners": [], "interconnections": [], "bipartite": {"nodes": [], "links": []}, "upset": []}

        df_dp = _valid_drug_phase(self.loader.get_cancer_drug_phase(cancer, columns=["nct_id", "drug_name", "phase_bucket"]))
        if df_dp.empty:
            return {"partners": [], "interconnections": [], "bipartite": {"nodes": [], "links": []}, "upset": []}

        hub_lower = drug_name.lower()
        selected_ncts = set(df_dp.loc[df_dp["drug_name"].str.lower() == hub_lower, "nct_id"])
        
        if not selected_ncts:
            return {"partners": [], "interconnections": [], "bipartite": {"nodes": [], "links": []}, "upset": []}

        co_trials = df_dp[df_dp["nct_id"].isin(selected_ncts)]
        
        # 1. Group by nct_id to find exact regimens
        # To avoid noise, only consider valid asset names.
        regimens_by_trial = {}
        for nct, group in co_trials.groupby("nct_id"):
            valid_drugs = {str(d).strip() for d in group["drug_name"] if _is_valid_asset_name(str(d))}
            if valid_drugs:
                # Find the proper casing for the hub drug in this trial, or fallback
                hub_actual = next((d for d in valid_drugs if d.lower() == hub_lower), drug_name)
                # Keep original casing for others
                others = {d for d in valid_drugs if d.lower() != hub_lower}
                regimens_by_trial[nct] = (hub_actual, others)

        # 2. Find top partners
        partner_counts = Counter()
        for _, others in regimens_by_trial.values():
            for p in others:
                partner_counts[p] += 1
                
        top_partners_tuples = partner_counts.most_common(top_n)
        top_partner_names = {p[0] for p in top_partners_tuples}
        
        partners_out = [{"partner": name, "coappearance_trials": count} for name, count in top_partners_tuples]
        
        # 3. Build Interconnections (edges between top partners)
        interconnection_counts = Counter()
        for _, others in regimens_by_trial.values():
            # Only consider top partners
            relevant_others = sorted(list(others.intersection(top_partner_names)))
            if len(relevant_others) >= 2:
                # Count every pair
                import itertools
                for a, b in itertools.combinations(relevant_others, 2):
                    edge = tuple(sorted([a, b]))
                    interconnection_counts[edge] += 1
                    
        interconnections_out = [
            {"source": edge[0], "target": edge[1], "coappearance_trials": count}
            for edge, count in interconnection_counts.items()
        ]
        
        # 4. Build UpSet and Bipartite data
        # Only group exact regimens involving the hub and the top partners
        regimen_counts = Counter()
        for hub_actual, others in regimens_by_trial.values():
            relevant_others = others.intersection(top_partner_names)
            # Regimen is hub + relevant top partners
            regimen = tuple(sorted([hub_actual] + list(relevant_others)))
            regimen_counts[regimen] += 1
            
        upset_out = []
        bipartite_nodes = []
        bipartite_links = []
        
        # Add drug nodes to bipartite
        bipartite_nodes.append({"name": drug_name, "type": "hub", "value": len(selected_ncts)})
        for name in top_partner_names:
            bipartite_nodes.append({"name": name, "type": "partner", "value": partner_counts[name]})
            
        for regimen, count in regimen_counts.items():
            if not regimen: continue
            
            # UpSet
            upset_out.append({"sets": list(regimen), "count": count})
            
            # Bipartite (only if combination of 2 or more)
            if len(regimen) >= 2:
                regimen_name = " + ".join(regimen)
                bipartite_nodes.append({"name": regimen_name, "type": "regimen", "value": count})
                for d in regimen:
                    bipartite_links.append({
                        "source": d if d.lower() != hub_lower else drug_name,
                        "target": regimen_name,
                        "value": count
                    })

        return {
            "drug": drug_name,
            "partners": partners_out,
            "interconnections": interconnections_out,
            "bipartite": {
                "nodes": bipartite_nodes,
                "links": bipartite_links
            },
            "upset": sorted(upset_out, key=lambda x: -x["count"])
        }



# ── helpers ────────────────────────────────────────────────────────────────

def _explode_pipe(series: pd.Series) -> Counter:
    c: Counter = Counter()
    for val in series.fillna(""):
        for item in parse_pipe(str(val)):
            if item:
                c[item] += 1
    return c


NON_ASSET_PATTERNS = [
    r"\bplacebo(s)?\b",
    r"\bmatching placebo(s)?\b",
    r"\bstandard of care\b",
    r"\bbest supportive care\b",
    r"\bsupportive care\b",
    r"\busual care\b",
    r"\bcontrol\b",
    r"\bsham\b",
    r"\bobservation(al)?\b",
    r"\bno intervention\b",
    r"\bradiation\b",
    r"\bradiotherapy\b",
    r"\bsurgery\b",
    r"\bsurgical\b",
    r"\bprocedure\b",
    r"\bdevice\b",
    r"\bquestionnaire\b",
    r"\bsurvey\b",
    r"\binterview\b",
    r"\bexercise\b",
    r"\bdiet\b",
    r"\beducation\b",
    r"\bbehavioral\b",
    r"\bimaging\b",
    r"\bdiagnostic\b",
    r"\bbiopsy\b",
    r"\bgene expression analysis\b",
    r"\bpolymerase chain reaction\b",
    r"\bpharmacokinetic\b",
    r"^\s*(arm|group|cohort)\s*[a-z0-9]*\s*$",
    r"^\s*(chemotherapy|immunotherapy|targeted therapy|hormone therapy|endocrine therapy)\s*$",
]


def _is_valid_asset_name(name: Any) -> bool:
    text = str(name or "").strip()
    if len(text) < 2 or text.lower() in {"nan", "none", "na", "n/a"}:
        return False
    lowered = text.lower()
    return not any(re.search(pattern, lowered, re.I) for pattern in NON_ASSET_PATTERNS)


def _valid_drug_phase(df_dp: pd.DataFrame) -> pd.DataFrame:
    if df_dp is None or df_dp.empty or "drug_name" not in df_dp.columns:
        return df_dp
    return df_dp[df_dp["drug_name"].map(_is_valid_asset_name)].copy()
