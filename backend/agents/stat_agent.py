import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import OrdinalEncoder, LabelEncoder
import asyncio
from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference

SENSITIVE_WORDS = [
    "gender", "sex", "race", "ethnicity", "age", "religion",
    "nationality", "marital", "disability", "zip", "zipcode",
    "postcode", "caste", "color", "colour", "native", "origin"
]

# Maximum unique values a column can have to be analysed as a categorical group.
# Numeric columns like "age" have 60+ values — skip those from the heatmap.
MAX_GROUPS_FOR_HEATMAP = 15


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
    return max(0, min(100, int(ratio * 100)))


async def run_stat_agent(df: pd.DataFrame, decision_column: str) -> dict:
    await asyncio.sleep(0)

    sensitive_cols = find_sensitive_columns(df, decision_column)

    feature_cols = [c for c in df.columns if c != decision_column]
    X = df[feature_cols].copy()

    # Keep only top 2 classes to prevent >100% bugs from 3+ classes (like NaNs)
    df[decision_column] = df[decision_column].astype(str).str.strip()
    top_classes = df[decision_column].value_counts().nlargest(2).index.tolist()
    df = df[df[decision_column].isin(top_classes)].copy()
    
    # Identify the "positive" (Approved) class
    pos_class = top_classes[0]
    for c in top_classes:
        cl = c.lower()
        if any(w in cl for w in ["approv", "yes", "1", ">50", "good", "pass"]):
            pos_class = c
            break
            
    neg_class = [c for c in top_classes if c != pos_class][0] if len(top_classes) > 1 else top_classes[0]
    
    # Standardize to 0_Rejected and 1_Approved so LabelEncoder sorts them as 0 and 1
    # This guarantees y_pred.mean() is the Approval Rate
    df[decision_column] = df[decision_column].map({neg_class: "0_Rejected", pos_class: "1_Approved"})
    
    le_target = LabelEncoder()
    y = le_target.fit_transform(df[decision_column])

    cat_cols = X.select_dtypes(include="object").columns.tolist()
    
    # Strip whitespace from all categorical columns (UCI Adult has " Male" not "Male")
    for c in cat_cols:
        X[c] = X[c].astype(str).str.strip()
    
    oe = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
    X[cat_cols] = oe.fit_transform(X[cat_cols])
    X = X.fillna(X.median(numeric_only=True))

    model = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=5)
    model.fit(X, y)
    y_pred = model.predict(X)

    results_per_group = {}
    all_scores = []

    # Filter to columns that are useful for heatmap analysis
    # Skip columns with too many unique values (e.g. age with 60+ values)
    heatmap_cols = []
    for col in sensitive_cols:
        n_unique = df[col].astype(str).str.strip().nunique()
        if n_unique <= MAX_GROUPS_FOR_HEATMAP:
            heatmap_cols.append(col)
        else:
            print(f"[StatAgent] Skipping '{col}' from heatmap ({n_unique} unique values > {MAX_GROUPS_FOR_HEATMAP} limit)")

    for col in heatmap_cols[:4]:
        # Strip whitespace for consistent group names
        groups_series = df[col].astype(str).str.strip()
        groups = groups_series.unique().tolist()
        group_rates = {}

        for group in groups:
            mask = groups_series == group
            if mask.sum() < 10:
                continue
            rate = round(float(y_pred[mask].mean()) * 100, 1)
            group_rates[group] = rate

        if len(group_rates) >= 2:
            rates = list(group_rates.values())
            all_scores.append(compute_fairness_score(rates))

        # Calculate mathematically strict bias metrics per group
        dp_diff = None
        eo_diff = None
        try:
            dp_diff = float(round(demographic_parity_difference(y, y_pred, sensitive_features=groups_series), 4))
            eo_diff = float(round(equalized_odds_difference(y, y_pred, sensitive_features=groups_series), 4))
        except Exception as e:
            print(f"Could not compute fairlearn metrics for {col}: {e}")

        # Compute gap info
        max_rate = max(group_rates.values()) if group_rates else 0
        min_rate = min(group_rates.values()) if group_rates else 0
        
        results_per_group[col] = {
            "groups": group_rates,
            "most_approved_group": max(group_rates, key=group_rates.get) if group_rates else "unknown",
            "least_approved_group": min(group_rates, key=group_rates.get) if group_rates else "unknown",
            "max_rate": max_rate,
            "min_rate": min_rate,
            "gap": round(max_rate - min_rate, 1),
            "demographic_parity_difference": dp_diff,
            "equalized_odds_difference": eo_diff,
        }

    fairness_score = int(np.mean(all_scores)) if all_scores else 50
    fairness_score = max(0, min(100, fairness_score))

    return {
        "fairness_score": fairness_score,
        "sensitive_columns": sensitive_cols,
        "results_per_group": results_per_group,
        "row_count": len(df),
        "decision_column": decision_column,
        # Internal objects — stripped by orchestrator before JSON serialization
        "_model": model,
        "_oe": oe,
        "_le": le_target,
        "_feature_cols": feature_cols,
        "_cat_cols": cat_cols,
    }