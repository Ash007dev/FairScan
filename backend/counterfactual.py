import pickle
import base64
import pandas as pd
import numpy as np


def run_counterfactual(row: dict, flip_column: str, flip_to: str, model_data: str) -> dict:
    # Deserialize the model bundle from base64 string
    model_bytes = base64.b64decode(model_data.encode())
    bundle = pickle.loads(model_bytes)

    model = bundle["model"]
    oe = bundle["oe"]
    le = bundle["le"]
    feature_cols = bundle["feature_cols"]
    cat_cols = bundle["cat_cols"]

    def predict_row(r: dict) -> dict:
        df = pd.DataFrame([r])

        # Keep only the columns the model was trained on
        for col in feature_cols:
            if col not in df.columns:
                df[col] = 0

        df = df[feature_cols].copy()

        # Encode categorical columns
        known_cats = [c for c in cat_cols if c in df.columns]
        if known_cats:
            df[known_cats] = oe.transform(df[known_cats].fillna("unknown"))

        df = df.fillna(0)

        proba = model.predict_proba(df)[0]
        pred_class = model.predict(df)[0]
        label = le.inverse_transform([pred_class])[0]

        return {
            "prediction": str(label),
            "confidence": round(float(max(proba)) * 100, 1),
        }

    before = predict_row(row)

    flipped_row = dict(row)
    flipped_row[flip_column] = flip_to
    after = predict_row(flipped_row)

    outcome_changed = before["prediction"] != after["prediction"]

    return {
        "original": {**before, "attribute_value": str(row.get(flip_column, ""))},
        "counterfactual": {**after, "attribute_value": flip_to},
        "outcome_changed": outcome_changed,
        "flip_column": flip_column,
        "delta_confidence": round(after["confidence"] - before["confidence"], 1),
    }