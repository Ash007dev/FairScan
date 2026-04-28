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
        # Clean column names (some versions have spaces)
        df.columns = [c.strip() for c in df.columns]
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
        "description": "UCI Adult Income dataset with known gender and race bias",
        "expected_finding": "Female applicants approved at ~11% vs male at ~31%"
    }


def get_demo_dataframe() -> pd.DataFrame:
    """Returns the demo dataset as a DataFrame"""
    download_demo_if_needed()
    return pd.read_csv(DEMO_CSV_PATH)


def get_sample_row() -> dict:
    """Returns a single sample row for counterfactual demo.
    
    HARDCODED row that is PROVEN to flip when sex changes from Male to Female.
    Found by find_flip_row.py — this 24yo Male/Husband, Bachelors, Prof-specialty
    worker with ZERO capital-gain flips from >50K (52%) to <=50K (79.6%) as Female.
    
    The zero capital-gain is critical: it forces the model to rely on sex/relationship
    for the decision, making the bias visible.
    """
    return {
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