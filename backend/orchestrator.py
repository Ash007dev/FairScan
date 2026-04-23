import asyncio
import traceback
from datetime import datetime
from agents.stat_agent import run_stat_agent
from agents.root_cause_agent import run_root_cause_agent
from agents.legal_mapper_agent import run_legal_mapper_agent
from agents.report_writer_agent import run_report_writer_agent


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

    log("All agents complete -- redirecting to results...", "info")

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
    }