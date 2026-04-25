from pdf_generator import generate_pdf

result = {
    "model_name": "Test",
    "fairness_score": 10,
    "stat": {"row_count": 100},
    "report": {
        "memo": """EXECUTIVE SUMMARY:
Test

**METHODOLOGY:**
Fairness Score: 13/100
Method: Adverse Impact Ratio (EEOC 4/5ths Rule)
Formula: min(group_approval_rate) / max(group_approval_rate) × 100
Interpretation: Score below 80 = legally significant adverse impact
Supporting metrics:
  • Demographic Parity Difference: N/A (fairlearn)
  • Equalized Odds Difference: N/A (fairlearn)

KEY FINDINGS:
* a
"""
    }
}
generate_pdf("test1234", result)
