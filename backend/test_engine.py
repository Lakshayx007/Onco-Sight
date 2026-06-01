from data_loader import DataLoader
from query_engine import QueryEngine

loader = DataLoader()
loader.load()
engine = QueryEngine(loader)

try:
    drugs = engine.top_drugs("Breast Cancer")
    print(f"Top drugs ok: {len(drugs)}")
except Exception as e:
    import traceback
    print("Error in top_drugs:")
    traceback.print_exc()

try:
    landscape = engine.drug_landscape("Breast Cancer")
    print(f"Landscape ok: {len(landscape)}")
except Exception as e:
    import traceback
    print("Error in drug_landscape:")
    traceback.print_exc()
