import json
import asyncio
import sys
import os

# Allow importing gemini_client from the parent backend/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from gemini_client import call_gemini

from agents.rules_engine import apply_rules

# -- Prompt template -----------------------------------------------------------
# {findings} gets replaced with the actual numbers before sending to Gemini
LEGAL_PROMPT = """You are a compliance expert. We have already identified the following regulatory violations using a hard-coded rule engine:

{rule_violations}

Here are the specific bias findings for context:
{findings}

Your job is to ENRICH these violations with context based on the specific findings.
Return ONLY a valid JSON array. No markdown. No explanation. Just the JSON.
Each object must have exactly these fields:
- "regulation": Keep the original regulation name
- "risk_level": Keep the original risk level
- "finding": Improve the finding to mention the specific column or specific numbers from the findings.
- "required_action": Keep or slightly improve the required action
- "deadline": Keep the original deadline
- "source": Keep the original source
- "grounded": true

Return exactly the same number of violations as provided in the rule_violations input."""


# -- Smart fallback based on fairness score -----------------------------------
# Used when Gemini fails or returns unparseable output
def _score_based_fallback(fairness_score: int) -> list:
    # Now we just rely on the rules engine directly!
    violations = apply_rules(fairness_score)
    
    # If score is healthy but we still need at least one finding
    if not violations:
        violations.append({
            "regulation": "EU AI Act Article 13",
            "risk_level": "low",
            "finding": "System shows acceptable fairness metrics but transparency documentation is required by law.",
            "required_action": "Publish a model card and bias audit report for regulatory review.",
            "deadline": "Next review cycle",
            "source": "EU AI Act 2024",
            "grounded": True
        })

    return violations


# Retry + model-switch logic now lives in gemini_client.py (shared across all agents)


# -- JSON parsing with fence stripping ----------------------------------------
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


# -- Main agent function -------------------------------------------------------
async def run_legal_mapper_agent(stat_result: dict, root_cause_result: dict) -> dict:
    # yield control briefly so FastAPI's async loop stays responsive
    await asyncio.sleep(0)

    fairness_score = stat_result.get("fairness_score", 50)
    
    # Step 1: Hard-coded rule engine (always reliable)
    rule_violations = apply_rules(fairness_score)

    # Build the findings dict that goes into the prompt
    findings_summary = {
        "fairness_score_out_of_100": fairness_score,
        "column_causing_most_bias": root_cause_result.get("top_bias_driver", "unknown"),
        "group_approval_rates": stat_result.get("results_per_group", {}),
        "top_features_by_importance": root_cause_result.get("feature_ranking", [])[:5],
    }

    prompt = LEGAL_PROMPT.format(
        rule_violations=json.dumps(rule_violations, indent=2),
        findings=json.dumps(findings_summary, indent=2)
    )

    violations = None

    try:
        raw_text = call_gemini(prompt, temperature=0.1, agent_name="LegalMapper")
        violations = _parse_gemini_json(raw_text)
        print(f"[LegalMapper] Successfully enriched {len(violations)} violations from Gemini.")

    except json.JSONDecodeError as e:
        print(f"[LegalMapper] JSON parse failed: {e} -- switching to score-based fallback.")
        violations = _score_based_fallback(fairness_score)

    except Exception as e:
        print(f"[LegalMapper] Gemini completely failed: {e} -- switching to score-based fallback.")
        violations = _score_based_fallback(fairness_score)

    # Make sure we have the grounded flag
    for v in violations:
        v["grounded"] = True

    # Count by risk level for the summary string
    high_count = len([v for v in violations if v.get("risk_level") == "high"])
    med_count  = len([v for v in violations if v.get("risk_level") == "medium"])

    return {
        "violations": violations,
        "summary": f"{high_count} high-risk, {med_count} medium-risk violations identified."
    }