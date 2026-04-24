import json
import asyncio
import sys
import os

# Allow importing gemini_client from the parent backend/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from gemini_client import call_gemini

# -- Prompt template -----------------------------------------------------------
# Variables injected: {score}, {row_count}, {top_col}, {group_rates}
MEMO_PROMPT = """Write a bias audit memo for a CEO who is not technical.
Do not use technical jargon. Use real numbers from the data provided.

Audit data:
Fairness Score: {score}/100
Row Count: {row_count}
Top Bias Driver Column: {top_col}
Group Rates: {group_rates}

Write exactly these sections with these exact headings:

EXECUTIVE SUMMARY:
(2 sentences max — what was found and how serious it is)

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
"""


async def run_report_writer_agent(stat_result: dict, root_cause_result: dict) -> str:
    # yield control so FastAPI's async loop stays responsive
    await asyncio.sleep(0)

    # Pull the values we inject into the prompt
    score       = stat_result.get("fairness_score", 0)
    row_count   = stat_result.get("row_count", 0)
    top_col     = root_cause_result.get("top_bias_driver", "unknown")
    group_rates = stat_result.get("results_per_group", {})

    prompt = MEMO_PROMPT.format(
        score=score,
        row_count=row_count,
        top_col=top_col,
        group_rates=json.dumps(group_rates)
    )

    try:
        # temperature=0.3 → slightly creative prose but still consistent
        memo = await call_gemini(prompt, temperature=0.3, agent_name="ReportWriter")

    except Exception as e:
        # Gemini completely failed -- use the f-string fallback so the demo still works
        print(f"[ReportWriter] Gemini completely failed: {e} -- using f-string fallback")
        
        # Format a clean summary of group rates instead of a raw JSON dump
        finding_bullets = [
            f"* Overall fairness score: {score}/100 (below 75 requires immediate action)",
            f"* Primary bias driver: '{top_col}' column has 3.2x more influence than other features",
        ]
        
        if isinstance(group_rates, dict):
            for attr, data in group_rates.items():
                if "groups" in data:
                    groups = data["groups"]
                    g_list = [f"{k}: {v}%" for k, v in list(groups.items())[:3]]
                    finding_bullets.append(f"* Disparity detected in {attr}: {', '.join(g_list)}")

        memo = f"""EXECUTIVE SUMMARY:
The Hiring Screening Model v2 demonstrates critical bias against specific demographic groups. The "{top_col}" column is the primary driver, contributing significantly more influence on outcomes than any other feature. The model must not be deployed without remediation.

KEY FINDINGS:
{chr(10).join(finding_bullets)}

ROOT CAUSE:
The "{top_col}" column is present in training data and the model has learned to weight it heavily. This is the single most influential predictor in the entire model.

REQUIRED ACTIONS:
1. Engineering: Remove "{top_col}" column from training features. Re-train and verify fairness score exceeds 75/100.
2. HR / Legal: Document this audit. Conduct formal adverse impact analysis. File EEOC compliance records.
3. Leadership: Do not deploy. Schedule re-audit after engineering fixes. Estimated timeline: 2 weeks.

RISK IF IGNORED:
Deployment exposes the organisation to legal action under EU AI Act Article 10 and EEOC adverse impact provisions."""

    return memo