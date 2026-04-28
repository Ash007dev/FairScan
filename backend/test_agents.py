import asyncio
import os
from dotenv import load_dotenv

from agents.legal_mapper_agent import run_legal_mapper_agent
from agents.report_writer_agent import run_report_writer_agent

# Ensure API Key is loaded if running independently
load_dotenv()

async def main():
    print("=== Testing Agents Independently ===\n")
    
    # 1. Mock inputs
    fake_stat_result = {
        "fairness_score": 45,
        "row_count": 10000,
        "decision_column": "credit_approved",
        "results_per_group": {
            "sex": {
                "groups": {"Male": 85.0, "Female": 35.0},
                "most_approved_group": "Male",
                "least_approved_group": "Female"
            }
        }
    }
    
    fake_root_cause_result = {
        "top_bias_driver": "sex",
        "feature_ranking": [
            {"column": "sex", "shap_importance": 0.45},
            {"column": "income", "shap_importance": 0.20}
        ]
    }
    
    # 2. Test Legal Mapper
    print(" 1. Testing Legal Mapper Agent \n")
    legal_output = await run_legal_mapper_agent(fake_stat_result, fake_root_cause_result)
    
    violations = legal_output.get("violations", [])
    print(f"Summary: {legal_output.get('summary')}")
    print(f"Returned {len(violations)} violations.\n")
    
    required_fields = {"regulation", "risk_level", "finding", "required_action", "deadline"}
    all_fields_present = True
    
    if not violations:
        print("[FAIL] No violations returned.")
        all_fields_present = False
    
    for i, v in enumerate(violations):
        missing = required_fields - set(v.keys())
        if missing:
            print(f"[FAIL] Violation {i+1} missing fields: {missing}")
            all_fields_present = False
        else:
            print(f"[OK] Violation {i+1} has all required fields: {v.keys()}")
            
    if all_fields_present and violations:
        print("\n[SUCCESS] Legal Mapper verified.\n")
    else:
        print("\n[ERROR] Legal Mapper failed verification.\n")
        
    # 3. Test Report Writer
    print("====================================")
    print(" 2. Testing Report Writer Agent \n")
    report_output = await run_report_writer_agent(fake_stat_result, fake_root_cause_result)
    print("Generated Memo:\n")
    print(report_output)
    print("\n------------------------------\n")
    
    required_sections = [
        "EXECUTIVE SUMMARY:",
        "KEY FINDINGS:",
        "ROOT CAUSE:",
        "REQUIRED ACTIONS:",
        "RISK IF IGNORED:"
    ]
    
    all_sections_present = True
    for section in required_sections:
        if section not in report_output:
            print(f"[FAIL] Missing section: '{section}'")
            all_sections_present = False
        else:
            print(f"[OK] Found section: '{section}'")
            
    if all_sections_present:
        print("\n[SUCCESS] Report Writer Agent verified.\n")
    else:
        print("\n[ERROR] Report Writer Agent failed verification.\n")

if __name__ == "__main__":
    asyncio.run(main())
