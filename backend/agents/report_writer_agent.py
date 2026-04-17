import json
import asyncio
import sys
import os

# Allow importing gemini_client from the parent backend/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from gemini_client import call_gemini

MEMO_PROMPT = """Write a bias audit memo for a CEO who is not technical.
Do not use technical jargon. Use real numbers from the data provided.

Audit data:
Fairness Score: {score}
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
    await asyncio.sleep(0)

    score = stat_result.get("fairness_score", 0)
    row_count = stat_result.get("row_count", 0)
    top_col = root_cause_result.get("top_bias_driver", "unknown")
    group_rates = stat_result.get("results_per_group", {})
    
    prompt = MEMO_PROMPT.format(data=json.dumps(data, indent=2))

    try:
        # temperature=0.3 → slightly creative prose but still consistent
        memo = call_gemini(prompt, temperature=0.3, agent_name="ReportWriter")
    except Exception as e:
        print(f"[ReportWriter] Gemini completely failed: {e} — using f-string fallback")
        memo = f"""EXECUTIVE SUMMARY:
The model shows a fairness score of {score}/100 based on {row_count} rows analyzed, indicating significant bias. The primary cause is the "{top_col}" column.

KEY FINDINGS:
- Overall fairness score: {score}/100 (below 75 requires immediate action)
- Primary bias driver: "{top_col}" column dominates predictions
- Group disparities detected across demographic attributes: {group_rates}

ROOT CAUSE:
The "{top_col}" column has disproportionate influence on model predictions, creating systematically different outcomes across demographic groups.

REQUIRED ACTIONS:
1. Engineering: Remove or reweight the "{top_col}" column and retrain the model
2. HR / Legal: Conduct adverse impact analysis and document findings
3. Leadership: Do not deploy this model until fairness score exceeds 75/100

RISK IF IGNORED:
Deployment of this model may constitute unlawful discrimination under applicable employment and lending regulations."""

    return memo