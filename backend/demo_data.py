import pandas as pd
import os

DEMO_CSV_PATH = os.path.join(os.path.dirname(__file__), "demo_adult.csv")


def download_demo_if_needed():
    """Downloads UCI Adult Income dataset if not already present"""
    if os.path.exists(DEMO_CSV_PATH):
        return

    print("Downloading UCI Adult Income demo dataset...")
    try:
        from sklearn.datasets import fetch_openml
        data = fetch_openml("adult", version=2, as_frame=True)
        df = data.frame
        df.to_csv(DEMO_CSV_PATH, index=False)
        print(f"Demo dataset saved: {len(df)} rows")
    except Exception as e:
        print(f"Could not download demo dataset: {e}")


def get_demo_info() -> dict:
    """Returns info about the demo dataset for the frontend"""
    download_demo_if_needed()
    if not os.path.exists(DEMO_CSV_PATH):
        return {"available": False}

    df = pd.read_csv(DEMO_CSV_PATH, nrows=5)
    return {
        "available": True,
        "filename": "adult_income_demo.csv",
        "decision_column": "class",
        "total_rows": 48842,
        "columns": df.columns.tolist(),
        "description": "UCI Adult Income dataset — known gender and race bias",
        "expected_finding": "Female applicants approved at ~11% vs male at ~31%"
    }


def get_demo_dataframe() -> pd.DataFrame:
    """Returns the demo dataset as a DataFrame"""
    download_demo_if_needed()
    return pd.read_csv(DEMO_CSV_PATH)


def get_sample_row() -> dict:
    """Returns a single sample row for counterfactual demo"""
    download_demo_if_needed()
    df = pd.read_csv(DEMO_CSV_PATH, nrows=200)
    # Find a Male, high-hours row that is likely to be approved
    candidates = df[
        (df.get("sex", df.get("Sex", pd.Series(dtype=str))).astype(str).str.strip() == "Male") &
        (df.get("hours-per-week", df.get("hours_per_week", pd.Series(dtype=int))).fillna(0) >= 40)
    ]
    if len(candidates) > 0:
        row = candidates.iloc[0].to_dict()
    else:
        row = df.iloc[0].to_dict()
    # Convert to plain Python types
    return {k: (v.item() if hasattr(v, "item") else v) for k, v in row.items()}