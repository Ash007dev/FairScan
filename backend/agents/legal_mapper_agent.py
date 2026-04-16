import google.generativeai as genai
import json
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

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

Return 2 to 4 findings. Most critical violations only."""

FALLBACK_VIOLATIONS = [
    {
        "regulation": "EU AI Act Article 10",
        "risk_level": "high",
        "finding": "Automated decision system shows statistically significant demographic disparity in outcomes.",
        "required_action": "Remove protected attributes from training data and re-audit before deployment.",
        "deadline": "Immediate"
    },
    {
        "regulation": "EEOC Uniform Guidelines",
        "risk_level": "medium",
        "finding": "Approval rate disparity between demographic groups may constitute adverse impact.",
        "required_action": "Conduct formal adverse impact analysis and document remediation plan.",
        "deadline": "Within 30 days"
    }
]


async def run_legal_mapper_agent(stat_result: dict, root_cause_result: dict) -> dict:
    await asyncio.sleep(0)

    findings_summary = {
        "fairness_score_out_of_100": stat_result["fairness_score"],
        "column_causing_most_bias": root_cause_result.get("top_bias_driver", "unknown"),
        "group_approval_rates": stat_result["results_per_group"],
        "top_features_by_importance": root_cause_result.get("feature_ranking", [])[:5],
    }

    model = genai.GenerativeModel(
        model_name="gemini-1.5-pro",
        generation_config=genai.GenerationConfig(temperature=0.1)
    )

    prompt = LEGAL_PROMPT.format(findings=json.dumps(findings_summary, indent=2))

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Strip markdown fences if Gemini added them
        if "```" in text:
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else text
            if text.startswith("json"):
                text = text[4:]

        violations = json.loads(text.strip())

    except Exception as e:
        print(f"Legal mapper Gemini error: {e} — using fallback")
        violations = FALLBACK_VIOLATIONS

    high_count = len([v for v in violations if v.get("risk_level") == "high"])
    med_count = len([v for v in violations if v.get("risk_level") == "medium"])

    return {
        "violations": violations,
        "summary": f"{high_count} high-risk, {med_count} medium-risk violations identified."
    }