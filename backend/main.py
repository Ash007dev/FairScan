from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
import pandas as pd
import io, uuid, os, json, asyncio
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FairScan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Capped in-memory store — max 50 audits, oldest evicted first.
# Prevents unbounded memory growth during long demo sessions.
MAX_AUDITS = 50

class CappedAuditStore(dict):
    """A dict that silently drops the oldest entry when it exceeds MAX_AUDITS."""
    def __setitem__(self, key, value):
        if key not in self and len(self) >= MAX_AUDITS:
            # Remove the first (oldest) key
            oldest = next(iter(self))
            super().__delitem__(oldest)
            print(f"[AuditStore] Evicted oldest audit {oldest[:8]} to stay under {MAX_AUDITS} entries.")
        super().__setitem__(key, value)

audit_store = CappedAuditStore()


@app.get("/")
def home():
    return {"status": "FairScan is running", "version": "1.0.0"}


@app.post("/audit")
async def create_audit(
    file: UploadFile = File(...),
    decision_column: str = Form(...),
    model_name: str = Form(default="Uploaded Model")
):
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read file. Please upload a valid CSV.")

    if decision_column not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Column '{decision_column}' not found. Available columns: {df.columns.tolist()}"
        )

    if len(df) < 50:
        raise HTTPException(
            status_code=400,
            detail="Dataset is too small to perform meaningful statistical bias analysis. Please upload at least 50 rows."
        )

    if len(df.columns) < 3:
        raise HTTPException(
            status_code=400,
            detail="The uploaded data appears out of context or unstructured. Expected tabular data with multiple features (e.g., age, race, income) to analyze bias."
        )

    df = df.head(20000)

    audit_id = str(uuid.uuid4())
    audit_store[audit_id] = {
        "status": "running",
        "model_name": model_name,
        "progress": {
            "stat": "idle",
            "root_cause": "idle",
            "legal_mapper": "idle",
            "report_writer": "idle",
            "remediation": "idle"
        },
        "logs": []
    }

    asyncio.create_task(
        run_audit_background(audit_id, df, decision_column, model_name)
    )

    return {"audit_id": audit_id, "total_rows": len(df)}


async def run_audit_background(audit_id, df, decision_column, model_name):
    try:
        from orchestrator import run_audit
        result = await asyncio.wait_for(
            run_audit(df, decision_column, model_name, audit_id, audit_store),
            timeout=60.0
        )
        # Update in-place so the "progress" dict is preserved (frontend needs it)
        audit_store[audit_id]["status"] = "complete"
        audit_store[audit_id]["result"] = result
    except asyncio.TimeoutError:
        audit_store[audit_id]["status"] = "error"
        audit_store[audit_id]["message"] = "Audit timed out. The dataset is too large or the AI agents took too long to respond."
    except Exception as e:
        import traceback
        traceback.print_exc()  # Full stack trace in server logs for debugging
        audit_store[audit_id]["status"] = "error"
        audit_store[audit_id]["message"] = str(e)


@app.get("/audit/{audit_id}/status")
def get_status(audit_id: str):
    if audit_id not in audit_store:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit_store[audit_id]


@app.get("/audit/{audit_id}/stream")
async def stream_status(audit_id: str):
    async def event_gen():
        while True:
            data = audit_store.get(audit_id, {})
            yield f"data: {json.dumps(data)}\n\n"
            if data.get("status") in ["complete", "error"]:
                break
            await asyncio.sleep(1)
    return StreamingResponse(event_gen(), media_type="text/event-stream")


# -- Pydantic model for counterfactual request validation --
class CounterfactualRequest(BaseModel):
    row: dict
    flip_column: str
    flip_to: str
    model_data: str


@app.post("/counterfactual")
def run_counterfactual_endpoint(payload: CounterfactualRequest):
    """Flip one attribute (e.g. Male->Female) and see if the prediction changes."""
    try:
        from counterfactual import run_counterfactual
        return run_counterfactual(
            row=payload.row,
            flip_column=payload.flip_column,
            flip_to=payload.flip_to,
            model_data=payload.model_data
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Counterfactual failed: {str(e)}")


@app.get("/audit/{audit_id}/report.pdf")
def download_pdf(audit_id: str):
    if audit_id not in audit_store or audit_store[audit_id]["status"] != "complete":
        raise HTTPException(status_code=404, detail="Audit not complete yet")
    from pdf_generator import generate_pdf
    path = generate_pdf(audit_id, audit_store[audit_id]["result"])
    return FileResponse(path, media_type="application/pdf", filename="fairscan_report.pdf")


@app.get("/demo/info")
def get_demo_info():
    """Returns info about the built-in demo dataset."""
    from demo_data import get_demo_info
    return get_demo_info()


@app.get("/demo/sample-row")
def get_demo_sample_row():
    """Returns a sample data row for the counterfactual toggle."""
    from demo_data import get_sample_row
    return get_sample_row()


@app.post("/demo/run")
async def run_demo():
    """One-click demo: loads the built-in UCI Adult dataset and starts an audit.
    No file upload needed perfect for the 'Try Demo' button on the frontend."""
    from demo_data import get_demo_dataframe

    try:
        df = get_demo_dataframe()
    except Exception:
        raise HTTPException(status_code=500, detail="Could not load demo dataset.")

    # Keep demo snappy (uploaded audits are capped to 20k too)
    df = df.head(20000)

    # Support both dataset variants:
    # - OpenML-style: label column is "class"
    # - Bundled CSV (repo root adult.csv): label column is "income"
    if "income" in df.columns:
        decision_column = "income"
    elif "class" in df.columns:
        decision_column = "class"
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Demo dataset missing label column. Expected 'income' or 'class'. Found: {df.columns.tolist()}"
        )
    model_name = "Hiring Screening Model v2"

    audit_id = str(uuid.uuid4())
    audit_store[audit_id] = {
        "status": "running",
        "model_name": model_name,
        "progress": {
            "stat": "idle",
            "root_cause": "idle",
            "legal_mapper": "idle",
            "report_writer": "idle",
            "remediation": "idle"
        },
        "logs": []
    }

    asyncio.create_task(
        run_audit_background(audit_id, df, decision_column, model_name)
    )

    return {"audit_id": audit_id, "total_rows": len(df)}