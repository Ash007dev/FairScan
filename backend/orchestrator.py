import asyncio
import traceback
from datetime import datetime
from agents.stat_agent import run_stat_agent
from agents.root_cause_agent import run_root_cause_agent
from agents.legal_mapper_agent import run_legal_mapper_agent
from agents.report_writer_agent import run_report_writer_agent


def validate_results(stat_result, root_cause_result, legal_result, report_result):
    warnings = []
    
    # Check 1: Top bias driver from SHAP should be in sensitive columns
    top_driver = root_cause_result.get("top_bias_driver")
    sensitive = stat_result.get("sensitive_columns", [])
    if top_driver not in sensitive:
        warnings.append({
            "type": "consistency",
            "message": f"Root cause '{top_driver}' not in sensitive columns {sensitive}. "
                       f"May indicate a proxy variable — investigate {top_driver} further.",
            "severity": "warning"
        })
    
    # Check 2: Fairness score should align with group rate gaps
    score = stat_result.get("fairness_score", 100)
    groups = stat_result.get("results_per_group", {})
    for col, data in groups.items():
        rates = list(data.get("groups", {}).values())
        if rates:
            computed_ratio = min(rates) / max(rates) * 100 if max(rates) > 0 else 100
            if abs(computed_ratio - score) > 15:
                warnings.append({
                    "type": "score_mismatch",
                    "message": f"Computed ratio for '{col}' ({computed_ratio:.0f}) "
                               f"differs from overall score ({score}). Multiple column averaging applied.",
                    "severity": "info"
                })
    
    # Check 3: Legal violations should exist if score is low
    violations = legal_result.get("violations", [])
    if score < 60 and len(violations) == 0:
        warnings.append({
            "type": "missing_violations",
            "message": "Fairness score is critical but no legal violations were identified. "
                       "Legal mapper may have failed — applying fallback rules.",
            "severity": "error"
        })
    
    # Check 4: Memo should mention the top bias driver
    memo = report_result.get("memo", "")
    if top_driver and top_driver not in memo:
        warnings.append({
            "type": "memo_inconsistency", 
            "message": f"Compliance memo does not mention root cause column '{top_driver}'. "
                       f"Report writer may not have received correct inputs.",
            "severity": "warning"
        })
    
    return warnings


async def run_audit(df, decision_column, model_name, audit_id, store):
    """Run all 4 agents in 2 parallel stages and update the store in real time."""

    def update(agent, status):
        store[audit_id]["progress"][agent] = status

    def log(text, log_type="ok"):
        entry = {
            "time": datetime.now().isoformat(),
            "text": text,
            "type": log_type,
        }
        store[audit_id].setdefault("logs", []).append(entry)
        # Also print to terminal for debugging
        prefix = {"ok": "OK", "info": ">>", "warn": "!!"}.get(log_type, "  ")
        print(f"[{audit_id[:8]}] {prefix} {text}")

    log(f"Loading dataset: {len(df)} rows, {len(df.columns)} columns", "info")
    log(f"Decision column: '{decision_column}'", "info")

    # -- Stage 1: run stat and root_cause in parallel --
    update("stat", "running")
    update("root_cause", "running")
    log("Stage 1: Computing fairness metrics and SHAP values...", "info")

    await asyncio.sleep(0.1)  # let the frontend see the "running" state

    results = await asyncio.gather(
        run_stat_agent(df, decision_column),
        run_root_cause_agent(df, decision_column),
        return_exceptions=True
    )

    stat_result = results[0]
    root_cause_result = results[1]

    # Check if stat_agent failed (we can't continue without fairness scores)
    if isinstance(stat_result, Exception):
        update("stat", "error")
        traceback.print_exception(type(stat_result), stat_result, stat_result.__traceback__)
        raise RuntimeError(f"Stat agent failed: {stat_result}")
    update("stat", "done")
    log(f"Fairness score computed: {stat_result['fairness_score']}/100", 
        "warn" if stat_result['fairness_score'] < 50 else "ok")

    # Check if root_cause_agent failed
    if isinstance(root_cause_result, Exception):
        update("root_cause", "error")
        traceback.print_exception(type(root_cause_result), root_cause_result, root_cause_result.__traceback__)
        raise RuntimeError(f"Root cause agent failed: {root_cause_result}")
    update("root_cause", "done")
    log(f"Root cause identified: '{root_cause_result['top_bias_driver']}' column", "ok")

    # Log sensitive columns detected
    sensitive = stat_result.get("sensitive_columns", [])
    if sensitive:
        log(f"Detected sensitive columns: {', '.join(sensitive[:5])}", "ok")

    # -- Stage 2: run legal_mapper and report_writer in parallel --
    update("legal_mapper", "running")
    update("report_writer", "running")
    log("Stage 2: Mapping to regulations and writing compliance memo...", "info")

    await asyncio.sleep(0.1)

    results2 = await asyncio.gather(
        run_legal_mapper_agent(stat_result, root_cause_result),
        run_report_writer_agent(stat_result, root_cause_result),
        return_exceptions=True
    )

    legal_result = results2[0]
    report_result = results2[1]

    # Legal mapper failure is non-fatal — use a fallback
    if isinstance(legal_result, Exception):
        update("legal_mapper", "error")
        print(f"WARNING: Legal mapper failed (using fallback): {legal_result}")
        legal_result = {
            "violations": [],
            "summary": "Legal analysis unavailable due to an error."
        }
    else:
        update("legal_mapper", "done")
        v_count = len(legal_result.get("violations", []))
        log(f"Found {v_count} regulatory violations", "ok")

    # Report writer failure is non-fatal — use a fallback
    if isinstance(report_result, Exception):
        update("report_writer", "error")
        print(f"WARNING: Report writer failed (using fallback): {report_result}")
        report_result = {
            "memo": "Report generation failed. Please review the statistical findings above.",
            "model_name": model_name,
            "fairness_score": stat_result["fairness_score"],
        }
    else:
        update("report_writer", "done")
        report_result = {
            "memo": report_result,
            "model_name": model_name,
            "fairness_score": stat_result["fairness_score"],
        }
        log("Compliance memo written", "ok")

    log("All agents complete running cross-agent validation...", "info")
    validation_warnings = validate_results(stat_result, root_cause_result, legal_result, report_result)
    log(f"Validation complete: {len(validation_warnings)} inconsistencies found", "ok" if len(validation_warnings) == 0 else "warn")

    # Remove internal model objects before storing (not JSON serializable)
    clean_stat = {k: v for k, v in stat_result.items() if not k.startswith("_")}

    return {
        "model_name": model_name,
        "decision_column": decision_column,
        "fairness_score": clean_stat["fairness_score"],
        "sensitive_columns": clean_stat["sensitive_columns"],
        "stat": clean_stat,
        "root_cause": root_cause_result,
        "legal": legal_result,
        "report": report_result,
        "validation_warnings": validation_warnings,
    }