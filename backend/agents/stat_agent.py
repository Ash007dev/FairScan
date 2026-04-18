import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import OrdinalEncoder, LabelEncoder
import asyncio
from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference

SENSITIVE_WORDS = [
    "gender", "sex", "race", "ethnicity", "age", "religion",
    "nationality", "marital", "disability", "zip", "zipcode",
    "postcode", "caste", "color", "colour", "native"
]


def find_sensitive_columns(df: pd.DataFrame, decision_col: str) -> list:
    """Find columns that likely represent demographic/protected attributes.
    Only matches by column NAME — avoids false positives like 'workclass' or 'relationship'."""
    found = []
    for col in df.columns:
        if col == decision_col:
            continue
        col_clean = col.lower().replace("_", "").replace("-", "").replace(" ", "")
        if any(word in col_clean for word in SENSITIVE_WORDS):
            found.append(col)
    found = list(set(found))
    # Sort based on SENSITIVE_WORDS index to prioritize words like gender, sex, race
    found.sort(key=lambda c: next((i for i, word in enumerate(SENSITIVE_WORDS) if word in c.lower().replace("_", "").replace("-", "").replace(" ", "")), 999))
    return found


def compute_fairness_score(rates: list) -> int:
    if not rates or max(rates) == 0:
        return 50
    ratio = min(rates) / max(rates)
    return int(ratio * 100)


async def run_stat_agent(df: pd.DataFrame, decision_column: str) -> dict:
    await asyncio.sleep(0)

    sensitive_cols = find_sensitive_columns(df, decision_column)

    feature_cols = [c for c in df.columns if c != decision_column]
    X = df[feature_cols].copy()

    le_target = LabelEncoder()
    y = le_target.fit_transform(df[decision_column].astype(str))

    cat_cols = X.select_dtypes(include="object").columns.tolist()
    oe = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
    X[cat_cols] = oe.fit_transform(X[cat_cols])
    X = X.fillna(X.median())

    model = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=8)
    model.fit(X, y)
    y_pred = model.predict(X)

    results_per_group = {}
    all_scores = []

    for col in sensitive_cols[:3]:
        groups = df[col].astype(str).unique().tolist()
        group_rates = {}

        for group in groups:
            mask = df[col].astype(str) == group
            if mask.sum() < 10:
                continue
            rate = round(float(y_pred[mask].mean()) * 100, 1)
            group_rates[group] = rate

        if len(group_rates) >= 2:
            rates = list(group_rates.values())
            all_scores.append(compute_fairness_score(rates))

        # We try to calculate mathematically strict bias metrics per group
        # Wrapped in a try/except so if missing data causes a math error, the demo stays alive!
        dp_diff = None
        eo_diff = None
        try:
            # demographic_parity measures if selection rates match across groups 
            dp_diff = float(round(demographic_parity_difference(y, y_pred, sensitive_features=df[col].astype(str)), 4))
            # equalized_odds measures if true positive/false positive rates match across groups
            eo_diff = float(round(equalized_odds_difference(y, y_pred, sensitive_features=df[col].astype(str)), 4))
        except Exception as e:
            print(f"Could not compute fairlearn metrics for {col}: {e}")

        results_per_group[col] = {
            "groups": group_rates,
            "most_approved_group": max(group_rates, key=group_rates.get) if group_rates else "unknown",
            "least_approved_group": min(group_rates, key=group_rates.get) if group_rates else "unknown",
            "demographic_parity_difference": dp_diff,
            "equalized_odds_difference": eo_diff,
        }

    fairness_score = int(np.mean(all_scores)) if all_scores else 50

    return {
        "fairness_score": fairness_score,
        "sensitive_columns": sensitive_cols,
        "results_per_group": results_per_group,
        "row_count": len(df),
        "decision_column": decision_column,
    }