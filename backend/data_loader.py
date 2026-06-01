"""
data_loader.py
--------------
Loads all processed data files on startup and holds them in RAM.
Every API request reads from these in-memory structures — zero disk I/O per request.

Data files (all in ../Context/data/processed/):
  - trials_processed.csv     : 123K rows × 69 cols — master trial table
  - drug_phase_map.csv       : 144K rows — one row per drug × phase × trial
  - cancer_hierarchy_final.json : 75 cancer groups with subtypes
  - drug_combination_partners.json : partner relationships per drug
"""

import ast
import json
import logging
import re
from pathlib import Path

import numpy as np
import pandas as pd

logger = logging.getLogger("oncopipeline.loader")

# Locate processed data relative to this file
_HERE = Path(__file__).parent
DATA_DIR = _HERE.parent / "Context" / "data" / "processed"

PHASE_ORDER = ["Early Phase 1", "Phase 1", "Phase 2", "Phase 3", "Phase 4"]

PIPE_COLS = [
    "conditions", "countries", "all_drugs_normalized", "biomarkers_all",
    "mutations_all", "ner_diseases_title", "ner_diseases_eligibility",
    "patient_profile_flags", "primary_outcomes_standardized",
    "drug_names", "biological_names", "intervention_names",
    "arm_labels", "arm_types", "collaborators", "collaborator_classes",
    "std_ages",
]

DATE_COLS = ["start_date", "primary_completion_date", "completion_date", "first_posted_date"]


class DataLoader:
    """Singleton data store. Loaded once at startup."""

    def __init__(self):
        self.df: pd.DataFrame = pd.DataFrame()
        self.df_drug_phase: pd.DataFrame = pd.DataFrame()
        self.cancer_hierarchy: dict = {}
        self.drug_partners: dict = {}
        self.cancer_index: dict[str, set] = {}   # cancer_name -> set of nct_ids
        self.cancer_list: list[str] = []
        self._loaded = False

    def load(self, data_dir: Path | None = None) -> None:
        if self._loaded:
            return
        base = data_dir or DATA_DIR
        logger.info("Loading data from %s …", base)

        # ── trials ──────────────────────────────────────────────────────────
        trials_path = base / "trials_processed.csv"
        if not trials_path.exists():
            raise FileNotFoundError(f"trials_processed.csv not found at {trials_path}")

        self.df = pd.read_csv(trials_path, low_memory=False)
        logger.info("  trials_processed: %s rows × %s cols", *self.df.shape)

        # normalise types
        for col in PIPE_COLS:
            if col in self.df.columns:
                self.df[col] = self.df[col].fillna("").astype(str).str.strip()
        for col in DATE_COLS:
            if col in self.df.columns:
                self.df[col] = pd.to_datetime(self.df[col], errors="coerce")
        if "enrollment_count" in self.df.columns:
            self.df["enrollment_count"] = pd.to_numeric(self.df["enrollment_count"], errors="coerce")

        # parse phase_buckets from stored list literal
        if "phase_buckets" in self.df.columns:
            self.df["phase_buckets_list"] = self.df["phase_buckets"].map(_parse_list_literal)
        else:
            self.df["phase_buckets_list"] = [[] for _ in range(len(self.df))]

        # ── drug–phase map ────────────────────────────────────────────────
        drug_path = base / "drug_phase_map.csv"
        if drug_path.exists():
            self.df_drug_phase = pd.read_csv(drug_path, low_memory=False)
            logger.info("  drug_phase_map: %s rows", len(self.df_drug_phase))
        else:
            logger.warning("drug_phase_map.csv not found — drug endpoints will be limited")

        # ── cancer hierarchy ──────────────────────────────────────────────
        hier_path = base / "cancer_hierarchy_final.json"
        if hier_path.exists():
            with open(hier_path, encoding="utf-8") as f:
                self.cancer_hierarchy = json.load(f)
            logger.info("  cancer_hierarchy: %s cancers", len(self.cancer_hierarchy))
        else:
            logger.warning("cancer_hierarchy_final.json not found — using condition column directly")

        # ── drug partners ─────────────────────────────────────────────────
        partners_path = base / "drug_combination_partners.json"
        if partners_path.exists():
            with open(partners_path, encoding="utf-8") as f:
                self.drug_partners = json.load(f)
            logger.info("  drug_combination_partners: %s entries", len(self.drug_partners))

        # ── pre-build cancer → nct_id index ──────────────────────────────
        self._build_cancer_index()

        self._loaded = True
        logger.info("Data load complete.")

    def _build_cancer_index(self) -> None:
        """Pre-compute set of nct_ids for every cancer in the hierarchy.
        
        Optimised: pre-build ONE combined lowercase text column per row,
        then run exactly 75 regex searches (one per cancer) instead of 375.
        """
        if not self.cancer_hierarchy:
            self.cancer_list = ["All Oncology"]
            return

        text_cols = [c for c in ["conditions", "brief_title", "official_title",
                                  "ner_diseases_title", "ner_diseases_eligibility"]
                     if c in self.df.columns]

        logger.info("  Building combined text column from %s cols …", len(text_cols))
        # One pass over all rows: join all text cols into a single lowercase string
        combined = (self.df[text_cols]
                        .fillna("")
                        .astype(str)
                        .agg(" | ".join, axis=1)
                        .str.lower())

        logger.info("  Indexing %s cancers …", len(self.cancer_hierarchy))
        for cancer, payload in self.cancer_hierarchy.items():
            cancer_term = str(cancer).lower().strip()
            if not cancer_term:
                continue
            mask = combined.str.contains(cancer_term, regex=False, na=False)

            # Index each specific subtype individually, and also include non-matching aliases in the broad mask
            for item in payload.get("subtypes", []):
                term = str(item.get("condition", "")).strip()
                if not term:
                    continue
                term_lower = term.lower()
                
                if cancer_term not in term_lower:
                    mask = mask | combined.str.contains(term_lower, regex=False, na=False)
                
                # Build index for the specific subtype
                subtype_mask = combined.str.contains(term_lower, regex=False, na=False)
                self.cancer_index[term] = set(self.df.loc[subtype_mask, "nct_id"].tolist())

            self.cancer_index[cancer] = set(self.df.loc[mask, "nct_id"].tolist())

        # Valid list includes "All Cancers", broad categories, and all specific subtypes
        self.cancer_list = ["All Cancers", "All Oncology"] + list(self.cancer_hierarchy.keys()) + [k for k in self.cancer_index.keys() if k not in self.cancer_hierarchy]
        logger.info("Cancer index built for %s total distinct cancer conditions", len(self.cancer_list))

    def get_cancer_df(self, cancer: str | list[str]) -> pd.DataFrame:
        """Return trials DataFrame filtered to one or multiple selected cancers."""
        cancers = [cancer] if isinstance(cancer, str) else cancer
        if "All Cancers" in cancers or "All Oncology" in cancers:
            return self.df
        
        nct_ids = set()
        for c in cancers:
            nct_ids.update(self.cancer_index.get(c, set()))
            
        if not nct_ids:
            return pd.DataFrame(columns=self.df.columns)
        return self.df[self.df["nct_id"].isin(nct_ids)]

    def get_cancer_drug_phase(self, cancer: str | list[str]) -> pd.DataFrame:
        """Return drug-phase map filtered to one or multiple selected cancers."""
        cancers = [cancer] if isinstance(cancer, str) else cancer
        if "All Cancers" in cancers or "All Oncology" in cancers:
            return self.df_drug_phase
            
        nct_ids = set()
        for c in cancers:
            nct_ids.update(self.cancer_index.get(c, set()))
            
        if self.df_drug_phase.empty or not nct_ids:
            return self.df_drug_phase.iloc[0:0]
        return self.df_drug_phase[self.df_drug_phase["nct_id"].isin(nct_ids)].copy()


# ── helpers ────────────────────────────────────────────────────────────────

def _parse_list_literal(value) -> list:
    if pd.isna(value):
        return []
    s = str(value).strip()
    if not s or s.lower() in ("nan", "[]", ""):
        return []
    try:
        parsed = ast.literal_eval(s)
        return parsed if isinstance(parsed, list) else [parsed]
    except Exception:
        return [s]


def parse_pipe(value: str) -> list[str]:
    if not value or str(value).lower() in ("nan", ""):
        return []
    return [item.strip() for item in str(value).split("|") if item.strip()]
