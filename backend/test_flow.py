"""End-to-end test for FairScan demo flow."""
import requests
import time
import json

BASE = "http://localhost:8000"

print("=" * 60)
print("FAIRSCAN END-TO-END TEST")
print("=" * 60)

# 1. Test root
r = requests.get(f"{BASE}/")
print(f"\n1. Root: {r.json()}")

# 2. Start demo audit
print("\n2. Starting demo audit...")
r = requests.post(f"{BASE}/demo/run")
data = r.json()
audit_id = data["audit_id"]
print(f"   Audit ID: {audit_id[:8]}")
print(f"   Total rows: {data['total_rows']}")

# 3. Poll until complete
print("\n3. Polling status...")
for i in range(40):
    r = requests.get(f"{BASE}/audit/{audit_id}/status")
    status_data = r.json()
    progress = status_data.get("progress", {})
    done = sum(1 for v in progress.values() if v == "done")
    logs = status_data.get("logs", [])
    print(f"   [{i:2d}] status={status_data['status']}  agents={done}/4  logs={len(logs)}")
    
    if status_data["status"] == "complete":
        print("   COMPLETE!")
        break
    if status_data["status"] == "error":
        print(f"   ERROR: {status_data.get('message')}")
        break
    time.sleep(2)

# 4. Check result
if status_data["status"] == "complete":
    result = status_data["result"]
    print(f"\n4. Results:")
    print(f"   Fairness score: {result['fairness_score']}/100")
    print(f"   Sensitive columns: {result.get('sensitive_columns', [])}")
    print(f"   Top bias driver: {result['root_cause']['top_bias_driver']}")
    print(f"   Violations: {len(result['legal']['violations'])}")
    print(f"   Model data length: {len(result['root_cause']['model_data'])} chars")
    
    # Show group rates
    for col, info in result['stat']['results_per_group'].items():
        print(f"\n   {col}:")
        for grp, rate in info['groups'].items():
            print(f"     {grp}: {rate}%")
    
    # 5. Test counterfactual
    print("\n5. Testing counterfactual (Sex: Male -> Female)...")
    sample = requests.get(f"{BASE}/demo/sample-row").json()
    print(f"   Sample row: sex={sample.get('sex')}, hrs={sample.get('hours-per-week')}")
    
    cf_result = requests.post(f"{BASE}/counterfactual", json={
        "row": sample,
        "flip_column": "sex",
        "flip_to": "Female",
        "model_data": result["root_cause"]["model_data"]
    }).json()
    
    print(f"   Original:       {cf_result['original']['prediction']} ({cf_result['original']['confidence']}%)")
    print(f"   Counterfactual: {cf_result['counterfactual']['prediction']} ({cf_result['counterfactual']['confidence']}%)")
    print(f"   OUTCOME CHANGED: {cf_result['outcome_changed']}")
    
    if cf_result['outcome_changed']:
        print("   >>> BIAS DETECTED! Demo moment works!")
    else:
        print("   >>> No change detected. Trying fallback row...")
        fallback = {
            "age": "38", "workclass": "Private", "education": "Bachelors",
            "education-num": "13", "marital-status": "Married-civ-spouse",
            "occupation": "Exec-managerial", "relationship": "Husband",
            "race": "White", "sex": "Male", "capital-gain": "5178",
            "capital-loss": "0", "hours-per-week": "50",
            "native-country": "United-States"
        }
        cf2 = requests.post(f"{BASE}/counterfactual", json={
            "row": fallback,
            "flip_column": "sex",
            "flip_to": "Female",
            "model_data": result["root_cause"]["model_data"]
        }).json()
        print(f"   Fallback Original:       {cf2['original']['prediction']} ({cf2['original']['confidence']}%)")
        print(f"   Fallback Counterfactual: {cf2['counterfactual']['prediction']} ({cf2['counterfactual']['confidence']}%)")
        print(f"   OUTCOME CHANGED: {cf2['outcome_changed']}")
    
    # 6. Test PDF
    print("\n6. Testing PDF generation...")
    r = requests.get(f"{BASE}/audit/{audit_id}/report.pdf")
    pdf_size = len(r.content)
    print(f"   PDF size: {pdf_size} bytes ({pdf_size / 1024:.1f} KB)")
    if pdf_size > 5000:
        print("   PDF looks good (>5KB)")
    else:
        print("   WARNING: PDF is too small!")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
