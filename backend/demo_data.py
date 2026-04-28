import os
from typing import Optional

import pandas as pd


_BACKEND_DIR = os.path.dirname(__file__)
_REPO_ROOT = os.path.abspath(os.path.join(_BACKEND_DIR, os.pardir))

# Prefer the bundled repo-root dataset (fast + no network).
_BUNDLED_DEMO_CSV_PATH = os.path.join(_REPO_ROOT, "adult.csv")

# Backward-compatible fallback for older deployments.
_LEGACY_DEMO_CSV_PATH = os.path.join(_BACKEND_DIR, "demo_adult.csv")

_DEMO_DF_CACHE: Optional[pd.DataFrame] = None


def _get_demo_csv_path() -> Optional[str]:
    for candidate in (_BUNDLED_DEMO_CSV_PATH, _LEGACY_DEMO_CSV_PATH):
        if os.path.exists(candidate):
            return candidate
    return None


def _download_demo_if_needed(path: str) -> None:
    """Downloads UCI Adult Income dataset if not already present.

    NOTE: In production (Render), we expect the repo to ship with adult.csv.
    This is only a fallback for local/dev.
    """
    if os.path.exists(path):
        return

    print("Downloading UCI Adult Income demo dataset...")
    try:
        from sklearn.datasets import fetch_openml

        data = fetch_openml("adult", version=2, as_frame=True)
        df = data.frame
        df.columns = [c.strip() for c in df.columns]
        df.to_csv(path, index=False)
        print(f"Demo dataset saved: {len(df)} rows")
    except Exception as e:
        print(f"Could not download demo dataset: {e}")


def get_demo_info() -> dict:
    """Returns info about the demo dataset for the frontend"""
    demo_path = _get_demo_csv_path()
    if demo_path is None:
        # Try to populate the legacy path as a last-resort fallback.
        _download_demo_if_needed(_LEGACY_DEMO_CSV_PATH)
        demo_path = _get_demo_csv_path()

    if demo_path is None:
        return {"available": False}

    preview_df = pd.read_csv(demo_path, nrows=5)
    total_rows = sum(1 for _ in open(demo_path, "r", encoding="utf-8", errors="ignore")) - 1

    # Decide label column based on what's present in the file.
    cols_lower = {c.lower(): c for c in preview_df.columns}
    decision_column = cols_lower.get("income") or cols_lower.get("class")
    return {
        "available": True,
        "filename": os.path.basename(demo_path),
        "decision_column": decision_column or "",
        "total_rows": max(total_rows, 0),
        "columns": preview_df.columns.tolist(),
        "description": "UCI Adult Income dataset (bundled) with known gender and race bias",
        "expected_finding": "Female applicants approved at ~11% vs male at ~31%"
    }


def get_demo_dataframe() -> pd.DataFrame:
    """Returns the demo dataset as a DataFrame"""
    global _DEMO_DF_CACHE

    if _DEMO_DF_CACHE is not None:
        return _DEMO_DF_CACHE

    demo_path = _get_demo_csv_path()
    if demo_path is None:
        _download_demo_if_needed(_LEGACY_DEMO_CSV_PATH)
        demo_path = _get_demo_csv_path()
    if demo_path is None:
        raise FileNotFoundError("Demo dataset not available (adult.csv missing)")

    _DEMO_DF_CACHE = pd.read_csv(demo_path)
    return _DEMO_DF_CACHE


def get_sample_row() -> dict:
    """Returns a single sample row for counterfactual demo.
    
    HARDCODED row that is PROVEN to flip when sex changes from Male to Female.
    Found by find_flip_row.py — this 24yo Male/Husband, Bachelors, Prof-specialty
    worker with ZERO capital-gain flips from >50K (52%) to <=50K (79.6%) as Female.
    
    The zero capital-gain is critical: it forces the model to rely on sex/relationship
    for the decision, making the bias visible.
    """
    # Return keys that match the active demo dataset schema.
    # The repo-root adult.csv uses dot-separated names (education.num, marital.status, ...)
    demo_path = _get_demo_csv_path()
    try:
        if demo_path is not None:
            cols = pd.read_csv(demo_path, nrows=1).columns.tolist()
        else:
            cols = []
    except Exception:
        cols = []

    if any(c.lower() == "income" for c in cols):
        return {
            "age": 24,
            "workclass": "Private",
            "fnlwgt": 313956,
            "education": "Bachelors",
            "education.num": 13,
            "marital.status": "Married-civ-spouse",
            "occupation": "Prof-specialty",
            "relationship": "Husband",
            "race": "White",
            "sex": "Male",
            "capital.gain": 0,
            "capital.loss": 0,
            "hours.per.week": 40,
            "native.country": "United-States",
        }

    # Legacy/OpenML-style schema
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
        "native-country": "United-States",
    }