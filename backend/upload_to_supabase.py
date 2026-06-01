import os
import sys
import pandas as pd
from sqlalchemy import create_engine
import time

# Connection string
DB_URI = "postgresql://postgres:fitinthebox1234@db.rxagcjdqysrsasjdgbzz.supabase.co:5432/postgres"

# File paths
TRIALS_CSV = "Context/data/processed/trials_processed.csv"
DRUG_PHASE_CSV = "Context/data/processed/drug_phase_map.csv"

from sqlalchemy.types import Text, Float, Integer, Boolean

def upload_in_chunks(engine, csv_path, table_name, chunksize=5000):
    print(f"Starting upload for {table_name} from {csv_path}...")
    start_time = time.time()
    
    # Read the first chunk to infer schema better and set up dtypes
    # We will read a sample of 10000 rows to ensure we capture string types instead of float/NaN
    df_sample = pd.read_csv(csv_path, nrows=10000, low_memory=False)
    
    # Create dtype mapping: force object/string columns to Text
    dtype_mapping = {}
    for col in df_sample.columns:
        if df_sample[col].dtype == 'object':
            dtype_mapping[col] = Text()
            
    # Replace table if exists using the sample schema
    df_sample.head(0).to_sql(table_name, engine, if_exists='replace', index=False, dtype=dtype_mapping)
    
    # Now append the data in chunks
    chunk_iter = pd.read_csv(csv_path, chunksize=chunksize, low_memory=False)
    
    total_rows = 0
    for i, chunk in enumerate(chunk_iter):
        chunk.to_sql(table_name, engine, if_exists='append', index=False, method='multi', dtype=dtype_mapping)
        total_rows += len(chunk)
        print(f"[{table_name}] Uploaded {total_rows} rows...")
        
    end_time = time.time()
    print(f"Finished {table_name} in {end_time - start_time:.2f} seconds. Total rows: {total_rows}\n")

import json
def upload_cancer_index(engine, csv_path, hierarchy_path):
    print("Building and uploading cancer_trials index...")
    df = pd.read_csv(csv_path, low_memory=False)
    with open(hierarchy_path, encoding="utf-8") as f:
        cancer_hierarchy = json.load(f)
        
    text_cols = [c for c in ["conditions", "brief_title", "official_title", "ner_diseases_title", "ner_diseases_eligibility"] if c in df.columns]
    combined = df[text_cols].fillna("").astype(str).agg(" | ".join, axis=1).str.lower()
    
    records = []
    
    # 1. All Oncology
    for nct_id in df["nct_id"]:
        records.append({"cancer_name": "All Oncology", "nct_id": nct_id})
        
    for cancer, payload in cancer_hierarchy.items():
        cancer_term = str(cancer).lower().strip()
        if not cancer_term:
            continue
        mask = combined.str.contains(cancer_term, regex=False, na=False)
        
        for item in payload.get("subtypes", []):
            term = str(item.get("condition", "")).strip()
            if not term:
                continue
            term_lower = term.lower()
            if cancer_term not in term_lower:
                mask = mask | combined.str.contains(term_lower, regex=False, na=False)
            
            subtype_mask = combined.str.contains(term_lower, regex=False, na=False)
            for nct_id in df.loc[subtype_mask, "nct_id"]:
                records.append({"cancer_name": term, "nct_id": nct_id})
                
        for nct_id in df.loc[mask, "nct_id"]:
            records.append({"cancer_name": cancer, "nct_id": nct_id})
            
    index_df = pd.DataFrame(records).drop_duplicates()
    print(f"Built index with {len(index_df)} rows. Uploading to cancer_trials...")
    index_df.to_sql("cancer_trials", engine, if_exists="replace", index=False, chunksize=10000, method="multi")
    print("cancer_trials index uploaded successfully!\n")
    
if __name__ == "__main__":
    engine = create_engine(DB_URI, pool_pre_ping=True)
    
    try:
        with engine.connect() as conn:
            print("Successfully connected to Supabase PostgreSQL!")
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)

    # 1. Upload trials
    if os.path.exists(TRIALS_CSV):
        upload_in_chunks(engine, TRIALS_CSV, "trials")
    else:
        print(f"ERROR: Could not find {TRIALS_CSV}")
        
    # 2. Upload drug_phase_map
    if os.path.exists(DRUG_PHASE_CSV):
        upload_in_chunks(engine, DRUG_PHASE_CSV, "drug_phase_map")
    else:
        print(f"ERROR: Could not find {DRUG_PHASE_CSV}")
        
    # 3. Upload cancer_trials index
    HIERARCHY_PATH = "Context/data/processed/cancer_hierarchy_final.json"
    if os.path.exists(HIERARCHY_PATH) and os.path.exists(TRIALS_CSV):
        upload_cancer_index(engine, TRIALS_CSV, HIERARCHY_PATH)
    else:
        print("ERROR: Could not find hierarchy or trials csv for index")
        
    print("Migration complete! You can now query your data from Supabase.")
