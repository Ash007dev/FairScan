LEGAL_RULES = [
    {
        "id": "EEOC_4_5THS",
        "regulation": "EEOC Uniform Guidelines on Employee Selection (29 CFR Part 1607)",
        "condition": lambda score: score < 80,  # adverse impact ratio < 0.8
        "risk_level": "high",
        "finding": "Adverse Impact Ratio below 0.8 threshold",
        "required_action": "Conduct validation study or discontinue use",
        "deadline": "Immediate",
        "source": "29 CFR 1607.4(D)"
    },
    {
        "id": "EU_AI_ACT_ART10",
        "regulation": "EU AI Act Article 10 — Data and Data Governance",
        "condition": lambda score: score < 75,
        "risk_level": "high",
        "finding": "Training data shows demographic disparity exceeding acceptable threshold",
        "required_action": "Implement data governance review before deployment",
        "deadline": "Immediate",
        "source": "EU AI Act 2024, Article 10(2)(f)"
    },
    {
        "id": "EU_AI_ACT_ART9",
        "regulation": "EU AI Act Article 9 — Risk Management System",
        "condition": lambda score: score < 80,
        "risk_level": "medium",
        "finding": "High-risk AI system lacks documented bias mitigation measures",
        "required_action": "Establish risk management documentation",
        "deadline": "Before deployment",
        "source": "EU AI Act 2024, Article 9"
    },
    {
        "id": "EEOC_MEDIUM",
        "regulation": "EEOC Uniform Guidelines — Documentation Requirement",
        "condition": lambda score: score >= 80 and score < 90,
        "risk_level": "medium",
        "finding": "Selection rates approach adverse impact threshold",
        "required_action": "Document selection procedures and maintain records",
        "deadline": "Within 30 days",
        "source": "29 CFR 1607.15"
    }
]

def apply_rules(fairness_score: int) -> list:
    """Hard-coded rule-based violations — always runs first"""
    triggered = []
    for rule in LEGAL_RULES:
        if rule["condition"](fairness_score):
            triggered.append({
                "regulation": rule["regulation"],
                "risk_level": rule["risk_level"],
                "finding": rule["finding"],
                "required_action": rule["required_action"],
                "deadline": rule["deadline"],
                "source": rule["source"],
                "grounded": True  # flag: this came from rules, not LLM
            })
    return triggered
