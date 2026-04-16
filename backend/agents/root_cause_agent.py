import pandas as pd
import numpy as np
import pickle
import base64
import asyncio
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import OrdinalEncoder, LabelEncoder


async def run_root_cause_agent(df: pd.DataFrame, decision_column: str) -> dict:
    await asyncio.sleep(0)

    feature_cols = [c for c in df.columns if c != decision_column]
    X = df[feature_cols].copy()

    le = LabelEncoder()
    y = le.fit_transform(df[decision_column].astype(str))

    cat_cols = X.select_dtypes(include="object").columns.tolist()
    oe = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
    X[cat_cols] = oe.fit_transform(X[cat_cols])
    X = X.fillna(X.median())

    model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=6)
    model.fit(X, y)

    # Try SHAP first, fall back to feature_importances_ if it fails
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        sample = X.sample(min(500, len(X)), random_state=42)
        shap_values = explainer.shap_values(sample)
        if isinstance(shap_values, list):
            sv = shap_values[1]
        else:
            sv = shap_values
        importances = np.abs(sv).mean(axis=0)
    except Exception:
        # Fallback: use built-in feature importances
        importances = model.feature_importances_

    feature_importance = dict(zip(feature_cols, importances.tolist()))
    ranked = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)

    # Serialize model so counterfactual endpoint can use it
    model_bundle = {
        "model": model,
        "oe": oe,
        "le": le,
        "feature_cols": feature_cols,
        "cat_cols": cat_cols,
    }
    model_data = base64.b64encode(pickle.dumps(model_bundle)).decode()

    top_driver = ranked[0][0] if ranked else "unknown"

    return {
        "top_bias_driver": top_driver,
        "feature_ranking": [
            {"column": col, "shap_importance": round(float(val), 4)}
            for col, val in ranked[:10]
        ],
        "explanation": (
            f"The column '{top_driver}' has the highest influence on predictions "
            f"with an importance score of {round(ranked[0][1], 4)}."
        ),
        "model_data": model_data,
    }