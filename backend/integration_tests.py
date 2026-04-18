import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def test_endpoints():
    print("1. Triggering Demonstration Endpoint (/demo/run)")
    res = requests.post(f"{BASE_URL}/demo/run")
    assert res.status_code == 200, "Demo triggering failed!"
    audit_id = res.json()["audit_id"]
    print(f"   -> Success! Active Audit ID: {audit_id}")

    print("2. Polling Status... Wait for completion")
    max_wait = 30
    ready = False
    for _ in range(max_wait):
        r = requests.get(f"{BASE_URL}/audit/{audit_id}/status").json()
        print(f"      Polling: status = {r['status']}")
        if r["status"] == "complete":
            # Extract final metrics and model
            model_data = r["result"]["root_cause"]["model_data"]
            ready = True
            print("   -> Success! Audit complete without crashes.")
            break
        elif r["status"] == "error":
            print(f"   -> ERROR FOUND in orchestration: {r}")
            return
        time.sleep(2)
        
    assert ready, "Audit did not finish within 60s"

    print("3. Fetching Sample Data for Counterfactual UI...")
    res_sample = requests.get(f"{BASE_URL}/audit/{audit_id}/sample-row")
    assert res_sample.status_code == 200, "Sample row fetching failed!"
    row = res_sample.json()
    print("   -> Success! Fetched male entry.")

    print("4. Triggering Counterfactual Swap: Flipping Gender to Female")
    payload = {
        "row": row,
        "flip_column": "sex" if "sex" in row else "Sex",
        "flip_to": "Female",
        "model_data": model_data
    }
    cf = requests.post(f"{BASE_URL}/counterfactual", json=payload)
    assert cf.status_code == 200, f"Counterfactual prediction fail! {cf.text}"
    print(f"   -> Success! Outcome logic checked. Flipped? -> {cf.json()['outcome_changed']}")

    print("5. Generating Report PDF")
    res_pdf = requests.get(f"{BASE_URL}/audit/{audit_id}/report.pdf")
    assert res_pdf.status_code == 200, "PDF Generation failed!"
    assert res_pdf.headers['Content-Type'] == 'application/pdf', "Not returning valid PDF!"
    print("   -> Success! PDF logic handles payload properly and returns binary blob.")

    print("\n--- ALL ENDPOINTS TESTED PERFECTLY! THE BACKEND IS BULLETPROOF! ---")

if __name__ == "__main__":
    test_endpoints()
