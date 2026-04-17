import json
import asyncio
import sys
import os

# Allow importing gemini_client from the parent backend/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from gemini_client import call_gemini

# ── Prompt template ──────────────────────────────────────────────────────────
# {findings} gets replaced with the actual numbers before sending to Gemini
LEGAL_PROMPT = """You are a compliance expert who specialises in these laws:
- EU AI Act (Articles 9, 10, 13)
- EEOC Uniform Guidelines on Employee Selection (USA)
- RBI Fair Lending Guidelines (India)

Here are the bias findings from an automated decision system:

{findings}

Return ONLY a valid JSON array. No markdown. No explanation. Just the JSON.
Each object must have exactly these fields:
- "regulation": specific law and article (e.g. "EU AI Act Article 10")
- "risk_level": either "high", "medium", or "low"
- "finding": one sentence describing what was violated
- "required_action": one concrete action the organisation must take
- "deadline": e.g. "Immediate", "Within 30 days", "Next review cycle"

Return EXACTLY 2 to 4 findings. Most critical violations only.
Use EXACTLY these field names: regulation, risk_level, finding, required_action, deadline."""


# ── Smart fallback based on fairness score ───────────────────────────────────
# Used when Gemini fails or returns unparseable output
def _score_based_fallback(fairness_score: int) -> list:
    violations = []

    # Under 50 = high risk EU AI Act violation
    if fairness_score < 50:
        violations.append({
            "regulation": "EU AI Act Article 10",
            "risk_level": "high",
            "finding": f"System shows a fairness score of {fairness_score}/100, indicating severe demographic disparity in automated decisions.",
            "required_action": "Remove protected attributes from training data and rerun bias audit before any further deployment.",
            "deadline": "Immediate"
        })

    # Under 75 = medium risk EEOC violation
    if fairness_score < 75:
        violations.append({
            "regulation": "EEOC Uniform Guidelines",
            "risk_level": "medium",
            "finding": f"Approval rate disparity between demographic groups (fairness score: {fairness_score}/100) may constitute adverse impact under the 4/5ths rule.",
            "required_action": "Conduct a formal adverse impact analysis and document a remediation plan with HR and Legal.",
            "deadline": "Within 30 days"
        })

    # If score is healthy but we still need at least one finding
    if not violations:
        violations.append({
            "regulation": "EU AI Act Article 13",
            "risk_level": "low",
            "finding": "System shows acceptable fairness metrics but transparency documentation is required by law.",
            "required_action": "Publish a model card and bias audit report for regulatory review.",
            "deadline": "Next review cycle"
        })

    return violations


# Retry + model-switch logic now lives in gemini_client.py (shared across all agents)


# ── JSON parsing with fence stripping ────────────────────────────────────────
def _parse_gemini_json(text: str) -> list:
    """
    Strips ```json ... ``` fences that Gemini sometimes adds, then parses JSON.
    Raises json.JSONDecodeError if the text still isn't valid JSON.
    """
    if "```" in text:
        parts = text.split("```")
        # The content between the first pair of fences
        text = parts[1] if len(parts) > 1 else text
        # Strip the word "json" that Gemini puts right after the opening fence
        if text.startswith("json"):
            text = text[4:]

    return json.loads(text.strip())


# ── Main agent function ───────────────────────────────────────────────────────
async def run_legal_mapper_agent(stat_result: dict, root_cause_result: dict) -> dict:
    # yield control briefly so FastAPI's async loop stays responsive
    await asyncio.sleep(0)

    fairness_score = stat_result.get("fairness_score", 50)

    # Build the findings dict that goes into the prompt
    findings_summary = {
        "fairness_score_out_of_100": fairness_score,
        "column_causing_most_bias": root_cause_result.get("top_bias_driver", "unknown"),
        "group_approval_rates": stat_result.get("results_per_group", {}),
        "top_features_by_importance": root_cause_result.get("feature_ranking", [])[:5],
    }

    prompt = LEGAL_PROMPT.format(findings=json.dumps(findings_summary, indent=2))

    violations = None

    try:
        raw_text = call_gemini(prompt, temperature=0.1, agent_name="LegalMapper")
        violations = _parse_gemini_json(raw_text)
        print(f"[LegalMapper] Successfully parsed {len(violations)} violations from Gemini.")

    except json.JSONDecodeError as e:
        print(f"[LegalMapper] JSON parse failed: {e} — switching to score-based fallback.")
        violations = _score_based_fallback(fairness_score)

    except Exception as e:
        print(f"[LegalMapper] Gemini completely failed: {e} — switching to score-based fallback.")
        violations = _score_based_fallback(fairness_score)

    # Count by risk level for the summary string
    high_count = len([v for v in violations if v.get("risk_level") == "high"])
    med_count  = len([v for v in violations if v.get("risk_level") == "medium"])

    return {
        "violations": violations,
        "summary": f"{high_count} high-risk, {med_count} medium-risk violations identified."
    }