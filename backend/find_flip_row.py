"""Find a row that ACTUALLY flips when sex changes from Male to Female."""
import requests
import pandas as pd
import math
import json

BASE = "http://localhost:8000"

# First, run an audit to get the model
print("Starting audit...")
r = requests.post(f"{BASE}/demo/run")
audit_id = r.json()["audit_id"]
print(f"Audit ID: {audit_id[:8]}")

import time
for i in range(40):
    r = requests.get(f"{BASE}/audit/{audit_id}/status")
    if r.json()["status"] == "complete":
        break
    time.sleep(2)

result = r.json()["result"]
model_data = result["root_cause"]["model_data"]
print(f"Got model data ({len(model_data)} chars)")

# Load dataset and try many rows
df = pd.read_csv("demo_adult.csv")
for col in df.select_dtypes(include="object").columns:
    df[col] = df[col].astype(str).str.strip()

# Filter to Male rows that are >50K
males_approved = df[(df["sex"] == "Male") & (df["class"] == ">50K")]
print(f"\nTotal Male >50K rows: {len(males_approved)}")

def clean_row(row_series):
    """Convert a row to a clean JSON-safe dict."""
    d = {}
    for k, v in row_series.to_dict().items():
        if hasattr(v, "item"):
            val = v.item()
        else:
            val = v
        # Replace NaN/inf with defaults
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            val = 0
        elif isinstance(val, str):
            val = val.strip()
        d[k] = val
    return d

# Try rows with different education levels
for edu in ["HS-grad", "Some-college", "Assoc-voc", "Bachelors", "Assoc-acdm"]:
    candidates = males_approved[males_approved["education"] == edu].head(20)
    flip_count = 0
    tested = 0
    
    for _, row in candidates.iterrows():
        row_dict = clean_row(row)
        tested += 1
        
        try:
            cf = requests.post(f"{BASE}/counterfactual", json={
                "row": row_dict,
                "flip_column": "sex",
                "flip_to": "Female",
                "model_data": model_data
            }).json()
        except Exception as e:
            print(f"  Error: {e}")
            continue
        
        orig_conf = cf["original"]["confidence"]
        counter_conf = cf["counterfactual"]["confidence"]
        
        if cf["outcome_changed"]:
            flip_count += 1
            print(f"\n  *** FLIP FOUND! ***")
            print(f"  edu={edu} age={row_dict.get('age')} hrs={row_dict.get('hours-per-week')} occ={row_dict.get('occupation')}")
            print(f"  rel={row_dict.get('relationship')} marital={row_dict.get('marital-status')}")
            print(f"  {cf['original']['prediction']} ({orig_conf}%) -> {cf['counterfactual']['prediction']} ({counter_conf}%)")
            # Print full row for hardcoding
            del row_dict["class"]  # Remove target
            print(f"  Row: {json.dumps(row_dict)}")
            break
        elif orig_conf < 70:
            print(f"  Close: edu={edu} age={row_dict.get('age')} conf={orig_conf}% -> {counter_conf}%")
    
    print(f"  {edu}: {flip_count}/{tested} flipped")

print("\nDone!")
