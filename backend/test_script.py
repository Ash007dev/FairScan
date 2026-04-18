import asyncio
from demo_data import get_demo_dataframe, get_sample_row
from orchestrator import run_audit
from counterfactual import run_counterfactual
import traceback

async def main():
    try:
        print("--- Loading test data ---")
        # Load just 500 rows to ensure tests run fast without waiting for full dataset
        df = get_demo_dataframe().head(500)
        store = {"test_audit": {"progress": {}}}
        print("Test data loaded.")
        
        print("\n--- Running Orchestrator (Stat, Root Cause, Legal, Report) ---")
        res = await run_audit(df, "class", "Test Model", "test_audit", store)
        print("Orchestrator executed successfully!")
        
        # Print progress dict to ensure it maps correctly
        print("Agent Progress states:", store["test_audit"])
    except Exception as e:
        print("\n!!! ORCHESTRATOR FAILED !!!")
        traceback.print_exc()
        return

    try:
        print("\n--- Running Counterfactual ---")
        row = get_sample_row()
        model_data = res["root_cause"]["model_data"]
        
        # Test out standard "flip gender" demo case
        cf_res = run_counterfactual(row, "sex", "Female", model_data)
        print("Counterfactual executed successfully!")
        print(f"Prediction flipped? {cf_res['outcome_changed']}")
        print(f"Confidence Delta: {cf_res['delta_confidence']}%")
    except Exception as e:
        print("\n!!! COUNTERFACTUAL FAILED !!!")
        traceback.print_exc()
        return

if __name__ == "__main__":
    asyncio.run(main())
