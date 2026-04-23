const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function uploadDataset(
  file: File,
  decisionColumn: string,
  modelName: string
): Promise<{ audit_id: string; total_rows: number }> {
  const form = new FormData();
  form.append("file", file);
  form.append("decision_column", decisionColumn);
  form.append("model_name", modelName);
  const res = await fetch(`${API_URL}/audit`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function getAuditStatus(auditId: string) {
  const res = await fetch(`${API_URL}/audit/${auditId}/status`);
  if (!res.ok) throw new Error("Audit not found");
  return res.json();
}

export async function runCounterfactual(payload: {
  row: Record<string, any>;
  flip_column: string;
  flip_to: string;
  model_data: string;
}) {
  const res = await fetch(`${API_URL}/counterfactual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Counterfactual request failed");
  return res.json();
}

export async function getDemoInfo() {
  const res = await fetch(`${API_URL}/demo/info`);
  if (!res.ok) throw new Error("Could not load demo info");
  return res.json();
}

export async function getSampleRow() {
  const res = await fetch(`${API_URL}/demo/sample-row`);
  if (!res.ok) throw new Error("Could not load sample row");
  return res.json();
}

export async function startDemoAudit(decisionColumn: string = "class") {
  const res = await fetch(`${API_URL}/demo/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision_column: decisionColumn }),
  });
  if (!res.ok) throw new Error("Could not start demo audit");
  return res.json();
}

export function getPdfUrl(auditId: string): string {
  return `${API_URL}/audit/${auditId}/report.pdf`;
}