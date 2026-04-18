import asyncio
import traceback
from agents.stat_agent import run_stat_agent
from agents.root_cause_agent import run_root_cause_agent
from agents.legal_mapper_agent import run_legal_mapper_agent
from agents.report_writer_agent import run_report_writer_agent


async def run_audit(df, decision_column, model_name, audit_id, store):
    # Terminal colors for beautiful logging
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    RESET = '\033[0m'

    def update(agent, status):
        store[audit_id]["progress"][agent] = status
        
        # Print beautiful logs to the terminal
        colors = {"running": YELLOW, "done": GREEN, "error": RED}
        color = colors.get(status, RESET)
        status_text = status.upper()
        print(f"{BLUE}[{audit_id[:8]}]{RESET} ⚙️  {agent.replace('_', ' ').title():<18} | {color}{status_text}{RESET}")

    print(f"\n{GREEN}🚀 STARTING SCAN:{RESET} {model_name} (Audit ID: {audit_id})")

    # ── Stage 1: run stat and root_cause in parallel ──
    update("stat", "running")
    update("root_cause", "running")

    # return_exceptions=True means if one agent crashes, the other still finishes
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

    # Check if root_cause_agent failed (we need model_data for counterfactual)
    if isinstance(root_cause_result, Exception):
        update("root_cause", "error")
        traceback.print_exception(type(root_cause_result), root_cause_result, root_cause_result.__traceback__)
        raise RuntimeError(f"Root cause agent failed: {root_cause_result}")
    update("root_cause", "done")

    # ── Stage 2: run legal_mapper and report_writer in parallel ──
    update("legal_mapper", "running")
    update("report_writer", "running")

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
        print(f"{RED}⚠️ Legal mapper failed (using fallback): {legal_result}{RESET}")
        legal_result = {
            "violations": [],
            "summary": "Legal analysis unavailable due to an error."
        }
    else:
        update("legal_mapper", "done")

    # Report writer failure is non-fatal — use a fallback
    if isinstance(report_result, Exception):
        update("report_writer", "error")
        print(f"{RED}⚠️ Report writer failed (using fallback): {report_result}{RESET}")
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

    print(f"{GREEN}✅ SCAN COMPLETE:{RESET} {model_name} finished successfully.\n")

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