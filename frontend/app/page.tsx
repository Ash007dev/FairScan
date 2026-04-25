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
  const [modelName, setModelName] = useState("Hiring Screening Model v2");
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
    
    // Auto-select 'income' or 'class' if present
    if (cols.includes("income")) setDecisionCol("income");
    else if (cols.includes("class")) setDecisionCol("class");
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

  async function runDemo() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/demo/run`, { method: "POST" });
      const data = await res.json();
      router.push(`/loading/${data.audit_id}`);
    } catch (err: any) {
      setError("Could not load demo dataset.");
      setLoading(false);
    }
  }

  const sensitiveDetected = columns.filter(isSensitive);

  return (
    <main style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{ background: "#fff", borderBottom: "1px solid #e8e6e0", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>
          Fair<span style={{ color: "#dc2626" }}>Scan</span>
        </span>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {/* Nav links removed for cleaner MVP */}
        </div>
      </nav>

      <div style={{ textAlign: "center", padding: "64px 24px 44px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, marginBottom: 24, fontSize: 12, fontWeight: 500, color: "#666" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
          Google AI Hackathon 2026
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 800, color: "#111", letterSpacing: -1.5, marginBottom: 16, lineHeight: 1.1 }}>
          Find hidden bias<br />in your <span style={{ color: "#dc2626" }}>AI systems</span>
        </h1>
        <p style={{ fontSize: 16, color: "#666", maxWidth: 500, margin: "0 auto", lineHeight: 1.6, fontWeight: 450 }}>
          Upload any decision dataset. Four AI agents find the bias, name the 
          root cause, flag the law you&apos;re breaking, and show you the fix -- in under 30 seconds.
        </p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, maxWidth: 540, margin: "0 auto", padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.02)" }}>

        {/* File Card */}
        <label htmlFor="csv-upload" style={{ 
          display: "flex", alignItems: "center", gap: 16, 
          border: file ? "2px solid #22c55e" : "1px solid #e8e6e0", 
          borderRadius: 14, padding: "20px", cursor: "pointer", 
          background: file ? "#f0fdf4" : "#fafaf9", marginBottom: 24,
          transition: "all 0.2s"
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: file ? "#dcfce7" : "#fff", border: "1px solid #e8e6e0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {file ? "📄" : "☁️"}
          </div>
          <div style={{ flex: 1 }}>
            {file ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#166534" }}>{file.name}</div>
                <div style={{ fontSize: 12, color: "#22c55e", marginTop: 2, fontWeight: 500 }}>
                  {columns.length} columns found · {(file.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>Drop your dataset here</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>CSV files only · max 50MB</div>
              </>
            )}
          </div>
          {file && <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>Change</span>}
        </label>
        <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} />

        {/* Column grid */}
        {columns.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 12 }}>
              WHICH COLUMN IS THE AI&apos;S DECISION? (what your model predicts)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {columns.map(col => {
                const sensitive = isSensitive(col);
                const selected = decisionCol === col;
                return (
                  <button key={col} onClick={() => setDecisionCol(col)} style={{
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    border: selected ? "2px solid #dc2626" : sensitive ? "1px solid #e9d5ff" : "1px solid #e8e6e0",
                    background: selected ? "#fff" : sensitive ? "#faf5ff" : "#fff",
                    color: selected ? "#dc2626" : sensitive ? "#7e22ce" : "#111",
                    fontSize: 12, fontWeight: selected ? 700 : 500,
                    transition: "all 0.15s"
                  }}>
                    {col} {selected && "✓"}
                  </button>
                );
              })}
            </div>
            
            {sensitiveDetected.length > 0 && (
              <div style={{ 
                marginTop: 16, display: "flex", alignItems: "center", gap: 12, 
                padding: "12px 16px", background: "#faf5ff", border: "1px solid #e9d5ff", 
                borderRadius: 12, fontSize: 12, color: "#7c3aed" 
              }}>
                <span style={{ fontSize: 14 }}>ⓘ</span>
                <div style={{ flex: 1, fontWeight: 500 }}>
                  Auto-detected sensitive columns: <span style={{ fontWeight: 700 }}>{sensitiveDetected.join(", ")}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>-- shown in purple above</div>
              </div>
            )}
          </div>
        )}

        {/* Model name */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 8 }}>MODEL / SYSTEM NAME (for your audit report)</div>
          <input
            type="text"
            value={modelName}
            onChange={e => setModelName(e.target.value)}
            style={{ width: "100%", height: 48, border: "none", background: "#333", borderRadius: 10, padding: "0 16px", fontSize: 15, color: "#fff", outline: "none", boxSizing: "border-box", fontWeight: 500 }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !file || !decisionCol}
          style={{
            width: "100%", height: 52, 
            background: loading || !file || !decisionCol ? "#f5f5f4" : "#000",
            border: "none", borderRadius: 14, 
            color: loading || !file || !decisionCol ? "#a1a1aa" : "#fff", 
            fontSize: 15, fontWeight: 700, 
            cursor: loading || !file || !decisionCol ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            boxShadow: loading || !file || !decisionCol ? "none" : "0 4px 12px rgba(0,0,0,0.1)"
          }}
        >
          {loading ? "Uploading..." : "Run bias audit -- 4 AI agents · ~25 seconds"}
        </button>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#aaa" }}>
          No CSV? <span onClick={runDemo} style={{ color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>Load UCI Adult Income demo dataset</span> -- known gender bias included
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 44, paddingBottom: 44 }}>
        {[["#22c55e", "EU AI Act compliant output"], ["#3b82f6", "Powered by Google Gemini"], ["#a855f7", "No data stored after audit"], ["#f59e0b", "Results in under 30s"]].map(([color, label]) => (
          <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#777", fontWeight: 500 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color as string }} />
            {label}
          </div>
        ))}
      </div>
    </main>
  );
}