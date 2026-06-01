import sys
import re
import os

content = open('query_engine.py', 'r', encoding='utf-8').read()

replacements = [
    (r'def summary\(self, cancer: str\) -> dict:\n\s*df = self\.loader\.get_cancer_df\(cancer\)\n\s*df_dp = _valid_drug_phase\(self\.loader\.get_cancer_drug_phase\(cancer\)\)', 
     'def summary(self, cancer: str, filters: dict | None = None) -> dict:\n        df = self.loader.get_cancer_df(cancer)\n        df_dp = _valid_drug_phase(self.loader.get_cancer_drug_phase(cancer))\n        df, df_dp = self.apply_filters(df, df_dp, filters)'),
     
    (r'def funnel\(self, cancer: str, study_type: str \| None = None\) -> list\[dict\]:\n\s*df = self\.loader\.get_cancer_df\(cancer\)\n\s*df_dp = _valid_drug_phase\(self\.loader\.get_cancer_drug_phase\(cancer\)\)\n\n\s*if study_type:\n\s*df = df\[df\[\"study_type\"\] == study_type\]\n\s*df_dp = df_dp\[df_dp\.get\(\"study_type\", pd\.Series\(study_type, index=df_dp\.index\)\) == study_type\] \\\n\s*if \"study_type\" in df_dp\.columns else df_dp',
     'def funnel(self, cancer: str, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer)\n        df_dp = _valid_drug_phase(self.loader.get_cancer_drug_phase(cancer))\n        df, df_dp = self.apply_filters(df, df_dp, filters)'),
     
    (r'def top_drugs\(self, cancer: str, phase: str \| None = None,\n\s*sponsor_class: str \| None = None, top_n: int = 15\) -> list\[dict\]:\n\s*df = self\.loader\.get_cancer_df\(cancer\)\n\s*df_dp = _valid_drug_phase\(self\.loader\.get_cancer_drug_phase\(cancer\)\)',
     'def top_drugs(self, cancer: str, top_n: int = 15, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer)\n        df_dp = _valid_drug_phase(self.loader.get_cancer_drug_phase(cancer))\n        df, df_dp = self.apply_filters(df, df_dp, filters)'),

    (r'def sponsor_by_phase\(self, cancer: str\) -> list\[dict\]:\n\s*df = self\.loader\.get_cancer_df\(cancer\)',
     'def sponsor_by_phase(self, cancer: str, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer)\n        df, _ = self.apply_filters(df, None, filters)'),

    (r'def geography\(self, cancer: str, top_n: int = 30\) -> list\[dict\]:\n\s*df = self\.loader\.get_cancer_df\(cancer\)',
     'def geography(self, cancer: str, top_n: int = 30, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer)\n        df, _ = self.apply_filters(df, None, filters)'),

    (r'def biomarkers\(self, cancer: str, top_n: int = 12\) -> list\[dict\]:\n\s*df = self\.loader\.get_cancer_df\(cancer\)',
     'def biomarkers(self, cancer: str, top_n: int = 12, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer)\n        df, _ = self.apply_filters(df, None, filters)'),

    (r'def status_distribution\(self, cancer: str\) -> list\[dict\]:\n\s*df = self\.loader\.get_cancer_df\(cancer\)',
     'def status_distribution(self, cancer: str, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer)\n        df, _ = self.apply_filters(df, None, filters)\n        df = df[~df[\'overall_status\'].fillna(\'\').str.contains(\'Unknown\', case=False)]'),

    (r'def timeline\(self, cancer: str\) -> list\[dict\]:\n\s*df = self\.loader\.get_cancer_df\(cancer\)',
     'def timeline(self, cancer: str, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer)\n        df, _ = self.apply_filters(df, None, filters)'),

    (r'def biomarker_by_phase\(self, cancer: str, top_n: int = 10\) -> list\[dict\]:\n\s*df = self\.loader\.get_cancer_df\(cancer\)',
     'def biomarker_by_phase(self, cancer: str, top_n: int = 10, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer)\n        df, _ = self.apply_filters(df, None, filters)'),

    (r'def drug_landscape\(self, cancer: str, top_n: int = 20\) -> list\[dict\]:\n\s*df_dp = _valid_drug_phase\(self\.loader\.get_cancer_drug_phase\(cancer\)\)\n\s*df = self\.loader\.get_cancer_df\(cancer\)',
     'def drug_landscape(self, cancer: str, top_n: int = 20, filters: dict | None = None) -> list[dict]:\n        df_dp = _valid_drug_phase(self.loader.get_cancer_drug_phase(cancer))\n        df = self.loader.get_cancer_df(cancer)\n        df, df_dp = self.apply_filters(df, df_dp, filters)'),

    (r'def status_by_phase\(self, cancer: str\) -> list\[dict\]:\n\s*df = self\.loader\.get_cancer_df\(cancer\)',
     'def status_by_phase(self, cancer: str, filters: dict | None = None) -> list[dict]:\n        df = self.loader.get_cancer_df(cancer)\n        df, _ = self.apply_filters(df, None, filters)'),

    (r'def drug_partners\(self, cancer: str, drug_name: str, top_n: int = 10\) -> list\[dict\]:',
     'def drug_partners(self, cancer: str, drug_name: str, top_n: int = 10, filters: dict | None = None) -> list[dict]:')
]

for pat, repl in replacements:
    content = re.sub(pat, repl, content, count=1)

with open('query_engine.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
