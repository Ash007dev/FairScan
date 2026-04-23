"use client";

import { useState } from "react";
import { CounterfactualResponse } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  sampleRow: Record<string, any>;
  sensitiveColumns: string[];
  modelData: string;
}

export function CounterfactualToggle({ sampleRow, sensitiveColumns, modelData }: Props) {
  const [result, setResult] = useState<CounterfactualResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCase, setActiveCase] = useState("");
  const [error, setError] = useState("");

  // Build toggle cases dynamically from sensitive columns + sample row
  const CASES = [
    { label: "Sex: Male → Female", col: "sex", from: "Male", to: "Female" },
    { label: "Sex: Female → Male", col: "sex", from: "Female", to: "Male" },
    { label: "Race: White → Black", col: "race", from: "White", to: "Black" },
    { label: "Age: 35 → 55", col: "age", from: "35", to: "55" },
  ];

  async function runCase(c: typeof CASES[0]) {
    if (!modelData) {
      setError("No model data available. Please wait for the audit to complete.");
      return;
    }

    setLoading(true);
    setActiveCase(c.label);
    setError("");
    setResult(null);
    
    // Adjust base row for the case (e.g. if we want to flip FROM female, start with a female row)
    const baseRow = { ...sampleRow, [c.col]: String(c.from) };
    
    try {
      const res = await fetch(`${API_URL}/counterfactual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row: baseRow,
          flip_column: c.col,
          flip_to: String(c.to),
          model_data: modelData,
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(errData.detail || `Request failed: ${res.status}`);
      }
      
      const data: CounterfactualResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Could not compute counterfactual. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  const isApproved = (pred?: string): boolean => {
    if (!pred) return false;
    const p = pred.toLowerCase();
    return p.includes(">50") || p === "1" || p.includes("approv") || p.includes("high");
  };

  const formatPrediction = (pred?: string): string => {
    if (!pred) return "...";
    if (isApproved(pred)) return "Approved";
    return "Rejected";
  };

  return (
    <div style={{ background: "#f8f7f4", borderRadius: 16, padding: 24, border: "1px solid #e8e6e0" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {CASES.map(c => {
          // Check if column exists in sample row (case insensitive)
          const actualCol = Object.keys(sampleRow).find(k => k.toLowerCase() === c.col.toLowerCase());
          if (!actualCol) return null;

          return (
            <button 
              key={c.label} 
              onClick={() => runCase({ ...c, col: actualCol })}
              disabled={loading}
              style={{
                padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                cursor: loading ? "wait" : "pointer", 
                border: activeCase === c.label ? "2px solid #dc2626" : "1px solid #000",
                background: "#000", 
                color: "#fff",
                transition: "all 0.2s",
                opacity: loading && activeCase !== c.label ? 0.5 : 1,
                boxShadow: activeCase === c.label ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ 
          marginBottom: 16, padding: "12px 16px", borderRadius: 12,
          background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b",
          fontSize: 13, fontWeight: 600
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, position: "relative" }}>
        {loading && (
          <div style={{ 
            position: "absolute", inset: 0, background: "rgba(248, 247, 244, 0.7)", 
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, borderRadius: 12,
            fontSize: 14, fontWeight: 700, color: "#000"
          }}>
            Recomputing prediction...
          </div>
        )}

        {/* Original */}
        <div style={{ 
          background: "#fff", border: "1px solid #e8e6e0", borderRadius: 16, padding: 20,
          opacity: result ? 1 : 0.3
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 12 }}>
            ORIGINAL ({result?.original?.attribute_value || "—"})
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: result ? (isApproved(result.original?.prediction) ? "#22c55e" : "#dc2626") : "#ccc" }}>
            {result ? formatPrediction(result.original?.prediction) : "..."}
          </div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4, fontWeight: 500 }}>
            {result?.original?.confidence ?? "—"}% confidence
          </div>
        </div>

        {/* Counterfactual */}
        <div style={{ 
          background: result?.outcome_changed ? "#fef2f2" : "#fff", 
          border: result?.outcome_changed ? "2.5px solid #fca5a5" : "1px solid #e8e6e0",
          borderRadius: 16, padding: 20, opacity: result ? 1 : 0.3
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 12 }}>
            IF {result?.counterfactual?.attribute_value?.toUpperCase() || activeCase.split("→")[1]?.trim()?.toUpperCase() || "FLIPPED"} — same everything else
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: result ? (isApproved(result.counterfactual?.prediction) ? "#22c55e" : "#dc2626") : "#ccc" }}>
            {result ? formatPrediction(result.counterfactual?.prediction) : "..."}
          </div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4, fontWeight: 500 }}>
            {result?.counterfactual?.confidence ?? "—"}% confidence
          </div>
        </div>
      </div>

      {result && (
        <div style={{ 
          marginTop: 20, padding: "14px 20px", borderRadius: 12, 
          background: result.outcome_changed ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${result.outcome_changed ? "#fca5a5" : "#bbf7d0"}`,
          color: result.outcome_changed ? "#991b1b" : "#166534",
          fontSize: 14, fontWeight: 700, lineHeight: 1.5
        }}>
          {result.outcome_changed 
            ? `Outcome changed solely because of ${(result.flip_column || "attribute").toLowerCase()}. Same qualifications, same experience, same everything — only ${(result.flip_column || "attribute").toLowerCase()} is different. This is direct, provable discrimination.`
            : `Outcome remains unchanged when switching ${(result.flip_column || "attribute").toLowerCase()}. Confidence shifted by ${result.delta_confidence || 0}%. This suggests the model is robust to bias for this specific attribute change.`}
        </div>
      )}
    </div>
  );
}