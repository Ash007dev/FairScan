import requests

BASE = "http://localhost:8000"

# Start audit to get model
r = requests.post(f"{BASE}/demo/run")
audit_id = r.json()["audit_id"]

import time
for i in range(40):
    r = requests.get(f"{BASE}/audit/{audit_id}/status")
    if r.json()["status"] == "complete":
        break
    time.sleep(2)

model_data = r.json()["result"]["root_cause"]["model_data"]

row = {
    "age": 24,
    "workclass": "Private",
    "fnlwgt": 313956,
    "education": "Bachelors",
    "education-num": 13,
    "marital-status": "Married-civ-spouse",
    "occupation": "Prof-specialty",
    "relationship": "Husband",
    "race": "White",
    "sex": "Male",
    "capital-gain": 0,
    "capital-loss": 0,
    "hours-per-week": 40,
    "native-country": "United-States"
}

cf = requests.post(f"{BASE}/counterfactual", json={
    "row": row,
    "flip_column": "sex",
    "flip_to": "Female",
    "model_data": model_data
}).json()

print(f"Original:       {cf['original']['prediction']} ({cf['original']['confidence']}%)")
print(f"Counterfactual: {cf['counterfactual']['prediction']} ({cf['counterfactual']['confidence']}%)")
print(f"Changed: {cf['outcome_changed']}")
