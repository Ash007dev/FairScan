import pickle
import base64
import pandas as pd
import numpy as np


# When flipping a sensitive column, also flip correlated columns
# that would naturally change with the protected attribute.
# E.g., if we change sex=Male→Female, "relationship" should also change Husband→Wife.
CORRELATED_FLIPS = {
    "sex": {
        # When flipping sex, also flip relationship to be consistent
        "relationship": {
            "Husband": "Wife",
            "Wife": "Husband",
        }
    }
}


def run_counterfactual(row: dict, flip_column: str, flip_to: str, model_data: str) -> dict:
    """
    The demo centerpiece: flip one attribute on a real applicant row,
    re-run the trained model, and see if the outcome changes.
    
    This proves discrimination — same qualifications, different outcome.
    """
    # Step 1: Deserialize the model bundle from base64
    try:
        bundle = pickle.loads(base64.b64decode(model_data.encode("utf-8")))
    except Exception as e:
        raise ValueError(f"Could not deserialize model: {e}")

    model = bundle["model"]
    oe = bundle["oe"]
    le = bundle["le"]
    feature_cols = bundle["feature_cols"]
    cat_cols = bundle["cat_cols"]

    def predict_row(r: dict) -> dict:
        """Build a DataFrame from one row dict and run the model."""
        # Build DataFrame with EXACTLY the columns the model was trained on, in order
        row_data = {}
        for col in feature_cols:
            val = r.get(col, None)
            row_data[col] = [val]

        df = pd.DataFrame(row_data)

        # Encode categorical columns — must be strings for OrdinalEncoder
        cols_to_encode = [c for c in cat_cols if c in df.columns]
        if cols_to_encode:
            df[cols_to_encode] = df[cols_to_encode].fillna("unknown").astype(str)
            # Strip whitespace — UCI Adult dataset has " Male" not "Male"
            for c in cols_to_encode:
                df[c] = df[c].str.strip()
            df[cols_to_encode] = oe.transform(df[cols_to_encode])

        # Fill numeric NaN with 0 and coerce to float
        numeric_cols = [c for c in feature_cols if c not in cat_cols]
        for c in numeric_cols:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

        # Predict
        proba = model.predict_proba(df)[0]
        pred_idx = model.predict(df)[0]
        label = le.inverse_transform([pred_idx])[0]
        confidence = round(float(max(proba)) * 100, 1)

        return {
            "prediction": str(label),
            "confidence": confidence,
        }

    # Original prediction
    original_result = predict_row(row)
    original_result["attribute_value"] = str(row.get(flip_column, "")).strip()

    # Build the flipped row
    flipped_row = dict(row)
    flipped_row[flip_column] = flip_to

    # Also flip correlated columns (e.g., Husband→Wife when changing sex)
    flip_col_lower = flip_column.lower()
    for trigger_col, corr_map in CORRELATED_FLIPS.items():
        if trigger_col in flip_col_lower:
            for corr_col, val_map in corr_map.items():
                # Find the actual column name (case-insensitive match)
                actual_corr_col = None
                for k in flipped_row:
                    if k.lower() == corr_col.lower():
                        actual_corr_col = k
                        break
                if actual_corr_col:
                    current_val = str(flipped_row.get(actual_corr_col, "")).strip()
                    if current_val in val_map:
                        flipped_row[actual_corr_col] = val_map[current_val]
                        print(f"[Counterfactual] Also flipped {actual_corr_col}: {current_val} -> {val_map[current_val]}")

    flipped_result = predict_row(flipped_row)
    flipped_result["attribute_value"] = str(flip_to).strip()

    outcome_changed = original_result["prediction"] != flipped_result["prediction"]
    delta = round(flipped_result["confidence"] - original_result["confidence"], 1)

    print(f"[Counterfactual] {flip_column}: {row.get(flip_column)} -> {flip_to}")
    print(f"  Original:       {original_result['prediction']} ({original_result['confidence']}%)")
    print(f"  Counterfactual: {flipped_result['prediction']} ({flipped_result['confidence']}%)")
    print(f"  Changed: {outcome_changed}")

    return {
        "original": original_result,
        "counterfactual": flipped_result,
        "outcome_changed": outcome_changed,
        "flip_column": flip_column,
        "delta_confidence": delta,
    }