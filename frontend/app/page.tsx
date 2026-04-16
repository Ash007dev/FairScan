"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SENSITIVE_WORDS = ["gender", "sex", "race", "ethnicity", "age",
  "religion", "nationality", "marital", "disability", "zip", "native", "caste"];

function isSensitive(col: string): boolean {
  const clean = col.toLowerCase().replace(/[_\-\s]/g, "");
  return SENSITIVE_WORDS.some(w => clean.includes(w));
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [decisionCol, setDecisionCol] = useState("");
  const [modelName, setModelName] = useState("My AI Model");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setError("");
    setDecisionCol("");
    const text = await picked.text();
    const firstLine = text.split("\n")[0];
    const cols = firstLine.split(",").map(c => c.trim().replace(/"/g, ""));
    setColumns(cols);
  }

  async function handleSubmit() {
    if (!file) { setError("Please upload a CSV file first."); return; }
    if (!decisionCol) { setError("Please select the decision column."); return; }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("decision_column", decisionCol);
      form.append("model_name", modelName);
      const res = await fetch(`${API_URL}/audit`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();
      router.push(`/loading/${data.audit_id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Is the backend running?");
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{ background: "#fff", borderBottom: "1px solid #e8e6e0", padding: "0 24px", height: 50, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#111", letterSpacing: -0.5 }}>
          Fair<span style={{ color: "#dc2626" }}>Scan</span>
        </span>
        <div style={{ display: "flex", gap: 20 }}>
          {["How it works", "Docs", "Sign in"].map(l => (
            <span key={l} style={{ fontSize: 12, color: "#999", cursor: "pointer" }}>{l}</span>
          ))}
        </div>
      </nav>

      <div style={{ textAlign: "center", padding: "52px 24px 32px" }}>
        <h1 style={{ fontSize: 30, fontWeight: 600, color: "#111", letterSpacing: -0.8, marginBottom: 10, lineHeight: 1.2 }}>
          Find hidden bias<br />in your AI systems
        </h1>
        <p style={{ fontSize: 14, color: "#777", maxWidth: 400, margin: "0 auto", lineHeight: 1.65 }}>
          Upload any decision dataset. Four AI agents find the bias, name the cause,
          flag the law you&apos;re breaking, and write the fix — in 30 seconds.
        </p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 16, maxWidth: 500, margin: "0 auto", padding: 26 }}>

        {/* Upload zone */}
        <label htmlFor="csv-upload" style={{ display: "block", border: "2px dashed #d4d2ca", borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: "#fafaf7", marginBottom: 18 }}>
          {file ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#15803d" }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "#4ade80", marginTop: 4 }}>{columns.length} columns found — click to change</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Click to upload CSV</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>or drag and drop · max 50MB</div>
            </>
          )}
        </label>
        <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} />

        {/* Column picker */}
        {columns.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: ".07em", marginBottom: 8 }}>
              WHICH COLUMN IS THE DECISION? (what your model predicts)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {columns.map(col => {
                const sensitive = isSensitive(col);
                const selected = decisionCol === col;
                return (
                  <button key={col} onClick={() => setDecisionCol(col)} style={{
                    padding: "7px 8px", borderRadius: 8, cursor: "pointer",
                    border: selected ? "2px solid #1d4ed8" : sensitive ? "1px solid #e9d5ff" : "1px solid #e8e6e0",
                    background: selected ? "#eff6ff" : sensitive ? "#faf5ff" : "#fafaf7",
                    color: selected ? "#1e40af" : sensitive ? "#7e22ce" : "#555",
                    fontSize: 11, fontWeight: selected ? 700 : 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                  }}>
                    {col}
                  </button>
                );
              })}
            </div>
            {columns.some(isSensitive) && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#7c3aed", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "8px 12px" }}>
                Purple columns are auto-detected sensitive attributes (sex, race, age etc.)
              </div>
            )}
          </div>
        )}

        {/* Model name */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: ".07em", marginBottom: 6 }}>MODEL NAME (optional)</div>
          <input
            type="text"
            value={modelName}
            onChange={e => setModelName(e.target.value)}
            placeholder="e.g. Hiring Screening Model"
            style={{ width: "100%", height: 36, border: "1px solid #e0dedd", borderRadius: 8, padding: "0 11px", fontSize: 13, color: "#111", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#dc2626", marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !file || !decisionCol}
          style={{
            width: "100%", height: 44, background: loading || !file || !decisionCol ? "#ccc" : "#111",
            border: "none", borderRadius: 11, color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: loading || !file || !decisionCol ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Uploading..." : "Run bias audit — 4 agents, ~25 seconds"}
        </button>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#aaa" }}>
          No dataset?{" "}
          <span style={{ color: "#2563eb", cursor: "pointer", fontWeight: 500 }}>
            Load our demo (UCI Adult Income)
          </span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 28, paddingBottom: 24 }}>
        {[["#22c55e", "EU AI Act compliant"], ["#3b82f6", "Google Cloud powered"], ["#a855f7", "No data stored"]].map(([color, label]) => (
          <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#bbb" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color as string }} />
            {label}
          </div>
        ))}
      </div>
    </main>
  );
}