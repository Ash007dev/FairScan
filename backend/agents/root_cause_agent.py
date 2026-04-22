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

        # SHAP output formats vary by version and model type:
        # 1. List of arrays (one per class)
        # 2. 3D array (samples, features, classes)
        # 3. 2D array (samples, features)
        
        if isinstance(shap_values, list):
            # For binary/multi-class, usually index 1 is the 'positive' or 'higher' class
            sv = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        elif hasattr(shap_values, "values"): # new SHAP Explainer format
            sv = shap_values.values
            if len(sv.shape) == 3:
                sv = sv[:, :, 1] if sv.shape[2] > 1 else sv[:, :, 0]
        else:
            sv = shap_values

        if len(np.shape(sv)) == 3:
            sv = sv[:, :, 1] if np.shape(sv)[2] > 1 else sv[:, :, 0]

        # Calculate mean absolute importance per feature
        importances = np.abs(sv).mean(axis=0)
        
        # Ensure it's a flat list of floats
        if hasattr(importances, "flatten"):
            importances = importances.flatten()
    except Exception as e:
        print(f"[RootCause] SHAP failed, using fallback importances: {e}")
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