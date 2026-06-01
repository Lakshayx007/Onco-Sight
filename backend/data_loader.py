"""
data_loader.py
--------------
Loads data dynamically from Supabase PostgreSQL instead of keeping everything in RAM.
"""

from __future__ import annotations

import ast
import json
import logging
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import create_engine

logger = logging.getLogger("oncopipeline.loader")

# Locate processed data relative to this file
_HERE = Path(__file__).parent
DATA_DIR = _HERE.parent / "Context" / "data" / "processed"

PHASE_ORDER = ["Early Phase 1", "Phase 1", "Phase 2", "Phase 3", "Phase 4"]

# Connection string (using Session Pooler for IPv4 compatibility on Render)
DB_URI = "postgresql://postgres.rxagcjdqysrsasjdgbzz:fitinthebox1234@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

def parse_pipe(val: Any) -> list[str]:
    """Parse a pipe-separated string into a list of cleaned strings."""
    if pd.isna(val) or not str(val).strip():
        return []
    return [s.strip() for s in str(val).split("|") if s.strip()]

def _parse_list_literal(val: Any) -> list[str]:
    if pd.isna(val):
        return []
    text = str(val).strip()
    if text.startswith("[") and text.endswith("]"):
        try:
            parsed = ast.literal_eval(text)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
        except:
            pass
    return [text] if text else []

class DataLoader:
    def __init__(self, db_uri: str = DB_URI, data_dir: str | Path = DATA_DIR):
        self.db_uri = db_uri
        self.engine = create_engine(db_uri, pool_pre_ping=True)
        self.base = Path(data_dir)
        self._loaded = False
        
        self.cancer_hierarchy = {}
        self.drug_partners = {}
        self.cancer_list = ["All Oncology", "All Cancers"]

    def load(self, data_dir: Path | None = None) -> None:
        if self._loaded:
            return
            
        if data_dir:
            self.base = Path(data_dir)
        
        logger.info("Connecting to PostgreSQL at %s", self.db_uri.split("@")[-1])
        
        hier_path = self.base / "cancer_hierarchy_final.json"
        if hier_path.exists():
            with open(hier_path, encoding="utf-8") as f:
                self.cancer_hierarchy = json.load(f)
            logger.info("Loaded cancer_hierarchy with %s cancers", len(self.cancer_hierarchy))
            
        partners_path = self.base / "drug_combination_partners.json"
        if partners_path.exists():
            with open(partners_path, encoding="utf-8") as f:
                self.drug_partners = json.load(f)
            logger.info("Loaded drug_combination_partners with %s entries", len(self.drug_partners))
            
        self._loaded = True

        # Valid list includes "All Cancers", broad categories, and all specific subtypes
        valid = ["All Oncology", "All Cancers"]
        for cat, payload in self.cancer_hierarchy.items():
            valid.append(cat)
            for sub in payload.get("subtypes", []):
                if sub.get("condition"):
                    valid.append(sub["condition"])
                    
        # Ensure unique but preserve a reasonable order
        seen = set()
        out = []
        for v in valid:
            if v not in seen:
                seen.add(v)
                out.append(v)
        self.cancer_list = out
        
        logger.info("Data loader initialized successfully.")

    def get_cancer_df(self, cancer: str | list[str], columns: list[str] | None = None) -> pd.DataFrame:
        """Return trials DataFrame filtered to one or multiple selected cancers, fetching only requested columns."""
        if not self._loaded:
            self.load()
            
        cancers = [cancer] if isinstance(cancer, str) else cancer
        
        if columns:
            if "nct_id" not in columns:
                columns.append("nct_id")
            cols_str = ", ".join([f't."{c}"' for c in columns])
        else:
            cols_str = "t.*"
            
        if "All Cancers" in cancers or "All Oncology" in cancers:
            query = f"SELECT {cols_str} FROM trials t"
            df = pd.read_sql(query, self.engine)
        else:
            # We use ILIKE instead of an intersection table if the intersection table is not populated yet,
            # but ideally we use the intersection table.
            # Since we will upload cancer_trials, we can use it.
            # We map multiple cancers to an IN clause
            # Actually, to be safe, we can just use the cancer_trials table
            cancer_tuple = tuple(cancers)
            if len(cancer_tuple) == 1:
                query = f"""
                SELECT {cols_str} FROM trials t
                JOIN cancer_trials c ON t.nct_id = c.nct_id
                WHERE c.cancer_name = %(cancer)s
                """
                df = pd.read_sql(query, self.engine, params={"cancer": cancer_tuple[0]})
            else:
                query = f"""
                SELECT DISTINCT {cols_str} FROM trials t
                JOIN cancer_trials c ON t.nct_id = c.nct_id
                WHERE c.cancer_name IN %(cancers)s
                """
                df = pd.read_sql(query, self.engine, params={"cancers": cancer_tuple})
            
        # Post-process columns
        if "phase_buckets" in df.columns:
            df["phase_buckets_list"] = df["phase_buckets"].map(_parse_list_literal)
            
        if "first_posted_date" in df.columns:
            df["first_posted_date"] = pd.to_datetime(df["first_posted_date"], errors="coerce")
            
        return df

    def get_cancer_drug_phase(self, cancer: str | list[str], columns: list[str] | None = None) -> pd.DataFrame:
        """Return drug-phase map filtered to one or multiple selected cancers."""
        if not self._loaded:
            self.load()
            
        cancers = [cancer] if isinstance(cancer, str) else cancer
        
        if columns:
            if "nct_id" not in columns:
                columns.append("nct_id")
            cols_str = ", ".join([f'd."{c}"' for c in columns])
        else:
            cols_str = "d.*"
            
        if "All Cancers" in cancers or "All Oncology" in cancers:
            query = f"SELECT {cols_str} FROM drug_phase_map d"
            df = pd.read_sql(query, self.engine)
        else:
            cancer_tuple = tuple(cancers)
            if len(cancer_tuple) == 1:
                query = f"""
                SELECT {cols_str} FROM drug_phase_map d
                JOIN cancer_trials c ON d.nct_id = c.nct_id
                WHERE c.cancer_name = %(cancer)s
                """
                df = pd.read_sql(query, self.engine, params={"cancer": cancer_tuple[0]})
            else:
                query = f"""
                SELECT DISTINCT {cols_str} FROM drug_phase_map d
                JOIN cancer_trials c ON d.nct_id = c.nct_id
                WHERE c.cancer_name IN %(cancers)s
                """
                df = pd.read_sql(query, self.engine, params={"cancers": cancer_tuple})
            
        return df

