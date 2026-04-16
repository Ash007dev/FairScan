import google.generativeai as genai
import json
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MEMO_PROMPT = """Write a bias audit memo for a CEO or compliance officer.
They are not data scientists. Use plain English. Be direct. Use real numbers.

Audit data:
{data}

Write exactly these sections with these exact headings:

EXECUTIVE SUMMARY:
(2 sentences — what was found and how serious it is)

KEY FINDINGS:
- (bullet with real number)
- (bullet with real number)
- (bullet with real number)

ROOT CAUSE:
(1 paragraph — name the exact column causing bias and why it matters)

REQUIRED ACTIONS:
1. Engineering: (specific technical action)
2. HR / Legal: (specific compliance action)
3. Leadership: (specific decision to make)

RISK IF IGNORED:
(1 sentence naming the specific legal consequence)

Do not use jargon. Do not hedge. Every number must come from the data provided."""


async def run_report_writer_agent(stat_result: dict, root_cause_result: dict, model_name: str) -> dict:
    await asyncio.sleep(0)

    data = {
        "model_being_audited": model_name,
        "fairness_score": stat_result["fairness_score"],
        "rows_analyzed": stat_result["row_count"],
        "main_bias_cause": root_cause_result.get("top_bias_driver", "unknown"),
        "group_approval_rates": stat_result["results_per_group"],
        "top_shap_features": root_cause_result.get("feature_ranking", [])[:5],
    }

    model = genai.GenerativeModel(
        model_name="gemini-1.5-pro",
        generation_config=genai.GenerationConfig(temperature=0.3)
    )

    try:
        response = model.generate_content(
            MEMO_PROMPT.format(data=json.dumps(data, indent=2))
        )
        memo = response.text
    except Exception as e:
        print(f"Report writer Gemini error: {e} — using fallback")
        score = stat_result["fairness_score"]
        driver = root_cause_result.get("top_bias_driver", "unknown")
        memo = f"""EXECUTIVE SUMMARY:
The {model_name} shows a fairness score of {score}/100, indicating significant bias. The primary cause is the "{driver}" column.

KEY FINDINGS:
- Overall fairness score: {score}/100 (below 75 requires immediate action)
- Primary bias driver: "{driver}" column dominates predictions
- Group disparities detected across demographic attributes

ROOT CAUSE:
The "{driver}" column has disproportionate influence on model predictions, creating systematically different outcomes across demographic groups.

REQUIRED ACTIONS:
1. Engineering: Remove or reweight the "{driver}" column and retrain the model
2. HR / Legal: Conduct adverse impact analysis and document findings
3. Leadership: Do not deploy this model until fairness score exceeds 75/100

RISK IF IGNORED:
Deployment of this model may constitute unlawful discrimination under applicable employment and lending regulations."""

    return {
        "memo": memo,
        "model_name": model_name,
        "fairness_score": stat_result["fairness_score"],
    }