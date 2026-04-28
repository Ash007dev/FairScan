"""
Remediation Agent — the 5th agent in FairScan's pipeline.

Takes statistical results and root cause analysis, then generates
concrete, ranked remediation actions with estimated impact scores.
No LLM needed — this is pure data-driven logic.
"""

import asyncio


def _estimate_score_improvement(current_score: int, feature_importance: float, gap: float) -> int:
    """Estimate how many fairness points removing/fixing a feature would gain."""
    # The improvement is proportional to the feature's importance and the gap it causes
    # A feature with 0.25 importance causing a 20pp gap might recover ~18 points
    raw = feature_importance * gap * 2.5
    return max(1, min(40, int(raw)))


def _estimate_gap_closure(gap: float, feature_importance: float) -> float:
    """Estimate how many pp of gap would close if this feature were addressed."""
    # Higher importance = more of the gap is attributable to this feature
    return round(min(gap, gap * feature_importance * 3), 1)


async def run_remediation_agent(stat_result: dict, root_cause_result: dict) -> dict:
    """Generate ranked remediation recommendations with estimated impact."""
    await asyncio.sleep(0)

    actions = []
    current_score = stat_result.get("fairness_score", 50)
    feature_ranking = root_cause_result.get("feature_ranking", [])
    results_per_group = stat_result.get("results_per_group", {})
    sensitive_columns = stat_result.get("sensitive_columns", [])

    # Build a lookup of gaps per column
    column_gaps = {}
    for col, data in results_per_group.items():
        column_gaps[col] = {
            "gap": data.get("gap", 0),
            "max_rate": data.get("max_rate", 0),
            "min_rate": data.get("min_rate", 0),
            "most_approved": data.get("most_approved_group", "unknown"),
            "least_approved": data.get("least_approved_group", "unknown"),
            "groups": data.get("groups", {}),
        }

    # --- Action 1: Remove top bias-driving sensitive features ---
    for feat in feature_ranking[:5]:
        col = feat["column"]
        importance = feat["shap_importance"]

        if col in sensitive_columns and col in column_gaps:
            gap_info = column_gaps[col]
            gap = gap_info["gap"]
            improvement = _estimate_score_improvement(current_score, importance, gap)
            gap_closure = _estimate_gap_closure(gap, importance)

            actions.append({
                "id": f"remove_{col}",
                "priority": 1,
                "action": f"Remove '{col}' from training features",
                "description": (
                    f"The column '{col}' is a protected attribute with {gap}pp disparity between "
                    f"'{gap_info['most_approved']}' ({gap_info['max_rate']}%) and "
                    f"'{gap_info['least_approved']}' ({gap_info['min_rate']}%). "
                    f"Removing it forces the model to make decisions on qualifications alone."
                ),
                "estimated_score_change": f"+{improvement} points",
                "estimated_gap_closure": f"{gap_closure}pp",
                "risk": "low",
                "effort": "low",
                "category": "feature_removal",
            })

    # --- Action 2: Resampling to balance underrepresented groups ---
    for col, gap_info in column_gaps.items():
        groups = gap_info.get("groups", {})
        if len(groups) >= 2:
            max_group = gap_info["most_approved"]
            min_group = gap_info["least_approved"]
            gap = gap_info["gap"]

            if gap >= 10:
                actions.append({
                    "id": f"resample_{col}",
                    "priority": 2,
                    "action": f"Balance training data for '{col}'",
                    "description": (
                        f"Resample the dataset to equalize representation between "
                        f"'{max_group}' and '{min_group}' groups. Current approval gap is {gap}pp. "
                        f"Use techniques like SMOTE or stratified undersampling."
                    ),
                    "estimated_score_change": f"+{max(3, int(gap * 0.4))} points",
                    "estimated_gap_closure": f"{round(gap * 0.6, 1)}pp",
                    "risk": "medium",
                    "effort": "medium",
                    "category": "data_resampling",
                })

    # --- Action 3: Proxy variable investigation ---
    top_driver = root_cause_result.get("top_bias_driver", "")
    if top_driver and top_driver not in sensitive_columns:
        # The top driver is NOT a sensitive column — likely a proxy
        for col, gap_info in column_gaps.items():
            gap = gap_info["gap"]
            if gap >= 10:
                actions.append({
                    "id": f"proxy_{top_driver}",
                    "priority": 1,
                    "action": f"Investigate proxy variable '{top_driver}'",
                    "description": (
                        f"'{top_driver}' is the strongest predictor but is not a protected attribute. "
                        f"It may be acting as a proxy for '{col}' (which has a {gap}pp gap). "
                        f"Audit the correlation between '{top_driver}' and protected groups."
                    ),
                    "estimated_score_change": "+8-15 points",
                    "estimated_gap_closure": f"{round(gap * 0.4, 1)}pp",
                    "risk": "low",
                    "effort": "medium",
                    "category": "proxy_audit",
                })
                break  # Only one proxy warning needed

    # --- Action 4: Post-processing calibration ---
    if current_score < 70:
        actions.append({
            "id": "calibration",
            "priority": 3,
            "action": "Apply post-processing fairness calibration",
            "description": (
                "Use algorithmic fairness techniques (e.g., threshold optimization from Fairlearn, "
                "or reject-option classification) to adjust decision boundaries per group. "
                "This does not retrain the model but adjusts outputs to meet parity constraints."
            ),
            "estimated_score_change": f"+{max(5, int((80 - current_score) * 0.5))} points",
            "estimated_gap_closure": "varies",
            "risk": "low",
            "effort": "low",
            "category": "post_processing",
        })

    # --- Action 5: Documentation & compliance ---
    if current_score < 80:
        actions.append({
            "id": "documentation",
            "priority": 4,
            "action": "Document bias findings and mitigation plan",
            "description": (
                "Under EEOC guidelines (29 CFR 1607), any model with adverse impact ratio below 0.8 "
                "requires documented validation studies. Create a formal bias impact assessment "
                "and remediation timeline to demonstrate compliance effort."
            ),
            "estimated_score_change": "N/A (compliance)",
            "estimated_gap_closure": "N/A",
            "risk": "none",
            "effort": "medium",
            "category": "documentation",
        })

    # Sort by priority, then by estimated impact (descending)
    actions.sort(key=lambda a: a["priority"])

    # Deduplicate by id
    seen = set()
    unique_actions = []
    for a in actions:
        if a["id"] not in seen:
            seen.add(a["id"])
            unique_actions.append(a)

    # Calculate projected score if all actions taken
    total_improvement = 0
    for a in unique_actions:
        change = a["estimated_score_change"]
        if change.startswith("+") and "points" in change:
            try:
                pts = int(change.replace("+", "").replace(" points", "").split("-")[0])
                total_improvement += pts
            except ValueError:
                pass

    projected_score = min(100, current_score + total_improvement)

    return {
        "actions": unique_actions,
        "current_score": current_score,
        "projected_score": projected_score,
        "total_actions": len(unique_actions),
        "summary": (
            f"{len(unique_actions)} remediation actions identified. "
            f"If all are implemented, the fairness score could improve from "
            f"{current_score}/100 to approximately {projected_score}/100."
        ),
    }
