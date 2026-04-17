import os
import asyncio
import pandas as pd
from sklearn.datasets import fetch_openml
import warnings
warnings.filterwarnings("ignore")

from agents.stat_agent import run_stat_agent
from agents.root_cause_agent import run_root_cause_agent
from counterfactual import run_counterfactual

async def main():
    print("=== Demo Dataset Validation ===")
    
    # 1. UCI Adult
    print("\n--- UCI Adult Income ---")
    print("Downloading Adult dataset...")
    adult_data = fetch_openml("adult", version=2, as_frame=True)
    df_adult = adult_data.frame
    df_adult = df_adult.dropna(subset=["class"])
    # Convert category to object to match pd.read_csv behavior and prevent median() crash
    for col in df_adult.select_dtypes(include=['category']).columns:
        df_adult[col] = df_adult[col].astype('object')
    
    stat_adult = await run_stat_agent(df_adult, "class")
    print("UCI Adult Fairness Score:", stat_adult["fairness_score"])
    
    sex_groups = stat_adult["results_per_group"].get("sex", stat_adult["results_per_group"].get("Sex", {}))
    race_groups = stat_adult["results_per_group"].get("race", stat_adult["results_per_group"].get("Race", {}))
    
    print("Sex Approval Rates:", sex_groups.get("groups", {}))
    print("Race Approval Rates:", race_groups.get("groups", {}))
    
    male_rate = sex_groups.get("groups", {}).get("Male", 0)
    female_rate = sex_groups.get("groups", {}).get("Female", 0)
    
    spread = abs(male_rate - female_rate)
    print(f"Spread Male - Female: {spread:.1f}%")
    if spread > 15:
        print("[OK] Gap is > 15%")
    else:
        print("[WARN] Gap is not large enough")
        
    print(f"[UAT] Expected ~31% male vs ~11% female. Got: {male_rate}% Male vs {female_rate}% Female")
    
    # Counterfactual check
    print("Training root cause model to test counterfactual...")
    root_cause_adult = await run_root_cause_agent(df_adult, "class")
    model_data = root_cause_adult["model_data"]
    
    # Find a Male applicant with high hours, likely approved (>50K)
    candidates = df_adult[(df_adult["sex"] == "Male") & (df_adult["education"] == "Bachelors")]
    if len(candidates) > 0:
        row = candidates.iloc[0].to_dict()
    else:
        row = df_adult.iloc[0].to_dict()
    
    # Convert types
    row = {k: (v.item() if hasattr(v, "item") else str(v) if pd.api.types.is_categorical_dtype(v) else v) for k, v in row.items()}
    
    print("Counterfactual candidate sex:", row.get("sex"))
    cf_result = run_counterfactual(row, "sex", "Female", model_data)
    print(f"Original Prediction: {cf_result['original']['prediction']} ({cf_result['original']['confidence']}%)")
    print(f"Counterfactual Prediction: {cf_result['counterfactual']['prediction']} ({cf_result['counterfactual']['confidence']}%)")
    if cf_result["outcome_changed"]:
        print("[OK] Counterfactual flipped outcome!")
    else:
        print("[WARN] Counterfactual did not flip outcome, only confidence")

    # 2. German Credit
    print("\n--- German Credit ---")
    print("Downloading German Credit dataset...")
    credit_data = fetch_openml("credit-g", version=1, as_frame=True)
    df_credit = credit_data.frame
    df_credit = df_credit.dropna(subset=["class"])
    for col in df_credit.select_dtypes(include=['category']).columns:
        df_credit[col] = df_credit[col].astype('object')
    
    if "personal_status" in df_credit.columns:
        df_credit["sex"] = df_credit["personal_status"].apply(lambda x: "Male" if str(x).startswith("male") else "Female")
    
    stat_credit = await run_stat_agent(df_credit, "class")
    print("German Credit Fairness Score:", stat_credit["fairness_score"])
    
    credit_sex_groups = stat_credit["results_per_group"].get("sex", {})
    print("Sex Approval Rates:", credit_sex_groups.get("groups", {}))
    credit_male_rate = credit_sex_groups.get("groups", {}).get("Male", 0)
    credit_female_rate = credit_sex_groups.get("groups", {}).get("Female", 0)
    credit_spread = abs(credit_male_rate - credit_female_rate)
    print(f"Spread Male - Female: {credit_spread:.1f}%")
    if credit_spread > 15:
        print("[OK] Gap is > 15%")
    else:
        print("[WARN] Gap is < 15%")

    # 3. Medical Dataset (Diabetes)
    print("\n--- Medical Dataset (Diabetes) ---")
    print("Downloading Diabetes dataset...")
    diabetes_data = fetch_openml("diabetes", version=1, as_frame=True)
    df_diabetes = diabetes_data.frame
    df_diabetes = df_diabetes.dropna(subset=["class"])
    for col in df_diabetes.select_dtypes(include=['category']).columns:
        df_diabetes[col] = df_diabetes[col].astype('object')
    
    if "age" in df_diabetes.columns:
        df_diabetes["age_group"] = pd.cut(df_diabetes["age"], bins=[0, 30, 50, 100], labels=["Young", "Middle", "Senior"])
        # Ensure it's string format so stat_agent picks it up as discrete.
        df_diabetes["age_group"] = df_diabetes["age_group"].astype(str)
    
    stat_diabetes = await run_stat_agent(df_diabetes, "class")
    print("Diabetes Fairness Score:", stat_diabetes["fairness_score"])
    print("Age Group Rates:", stat_diabetes["results_per_group"].get("age_group", {}).get("groups", {}))

if __name__ == "__main__":
    asyncio.run(main())
