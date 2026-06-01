import re

with open("backend/query_engine.py", "r", encoding="utf-8") as f:
    content = f.read()

filter_cols_str = '\nFILTER_COLS = ["nct_id", "phase_buckets", "lead_sponsor_class", "study_type", "overall_status", "line_of_therapy", "is_combination", "countries", "first_posted_date"]\n\n'

# Insert FILTER_COLS after SPONSOR_CLASS_LABELS definition
content = re.sub(r'(SPONSOR_CLASS_LABELS = \{[^}]+\}\n)', r'\1' + filter_cols_str, content)

# 1. replace df and df_dp together
combined_old = r'df = self\.loader\.get_cancer_df\(cancer\)\s*df_dp = _valid_drug_phase\(self\.loader\.get_cancer_drug_phase\(cancer\)\)'
combined_new = r'df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS + ["enrollment_count"])\n        df_dp = _valid_drug_phase(self.loader.get_cancer_drug_phase(cancer, columns=["nct_id", "drug_name", "phase_bucket"]))'
content = re.sub(combined_old, combined_new, content)

# 2. replace specific df standalone calls
content = re.sub(r'def sponsor_by_phase.*?df = self\.loader\.get_cancer_df\(cancer\)', r'def sponsor_by_phase(self, cancer: str, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS)', content, flags=re.DOTALL)
content = re.sub(r'def geography.*?df = self\.loader\.get_cancer_df\(cancer\)', r'def geography(self, cancer: str, top_n: int = 30, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS)', content, flags=re.DOTALL)
content = re.sub(r'def biomarkers.*?df = self\.loader\.get_cancer_df\(cancer\)', r'def biomarkers(self, cancer: str, top_n: int = 12, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS + ["biomarkers_all", "mutations_all"])', content, flags=re.DOTALL)
content = re.sub(r'def status_distribution.*?df = self\.loader\.get_cancer_df\(cancer\)', r'def status_distribution(self, cancer: str, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS)', content, flags=re.DOTALL)
content = re.sub(r'def timeline.*?df = self\.loader\.get_cancer_df\(cancer\)', r'def timeline(self, cancer: str, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS)', content, flags=re.DOTALL)
content = re.sub(r'def biomarker_by_phase.*?df = self\.loader\.get_cancer_df\(cancer\)', r'def biomarker_by_phase(self, cancer: str, top_n: int = 10, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS + ["biomarkers_all", "mutations_all"])', content, flags=re.DOTALL)
content = re.sub(r'def status_by_phase.*?df = self\.loader\.get_cancer_df\(cancer\)', r'def status_by_phase(self, cancer: str, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS)', content, flags=re.DOTALL)
content = re.sub(r'def top_sponsors_detailed.*?df = self\.loader\.get_cancer_df\(cancer\)', r'def top_sponsors_detailed(self, cancer: str, top_n: int = 15, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer, columns=FILTER_COLS + ["collaborators"])', content, flags=re.DOTALL)

# 3. replace drug_partners
content = re.sub(r'def drug_partners.*?df_dp = _valid_drug_phase\(self\.loader\.get_cancer_drug_phase\(cancer\)\)', r'def drug_partners(self, cancer: str, drug_name: str, top_n: int = 10, filters: dict | None = None) -> dict:\n        if not _is_valid_asset_name(drug_name):\n            return {"partners": [], "interconnections": [], "bipartite": {"nodes": [], "links": []}, "upset": []}\n\n        df_dp = _valid_drug_phase(self.loader.get_cancer_drug_phase(cancer, columns=["nct_id", "drug_name", "phase_bucket"]))', content, flags=re.DOTALL)

with open("backend/query_engine.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Rewrote query_engine.py")
