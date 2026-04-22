"use client";

import { useState } from "react";
import { CounterfactualResponse } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  sampleRow: Record<string, any>;
  sensitiveColumns: string[];
  modelData: string;
}

export function CounterfactualToggle({ sampleRow, modelData }: Props) {
  const [result, setResult] = useState<CounterfactualResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCase, setActiveCase] = useState("");

  const CASES = [
    { label: "Sex: Male → Female", col: "sex", from: "Male", to: "Female" },
    { label: "Sex: Female → Male", col: "sex", from: "Female", to: "Male" },
    { label: "Race: White → Non-white", col: "race", from: "White", to: "Black" },
    { label: "Age: 35 → 55", col: "age", from: 35, to: 55 },
  ];

  async function runCase(c: typeof CASES[0]) {
    setLoading(true);
    setActiveCase(c.label);
    
    // Adjust base row for the case (e.g. if we want to flip FROM female, start with a female row)
    const baseRow = { ...sampleRow, [c.col]: c.from };
    
    try {
      const res = await fetch(`${API_URL}/counterfactual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row: baseRow,
          flip_column: c.col,
          flip_to: c.to,
          model_data: modelData,
        }),
      });
      const data: CounterfactualResponse = await res.json();
      setResult(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const isApproved = (pred: string) => 
    pred === "1" || pred.toLowerCase().includes("approv") || pred.toLowerCase().includes(">50k") || pred.toLowerCase().includes("high");

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
              style={{
                padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                cursor: "pointer", border: activeCase === c.label ? "2px solid #000" : "1px solid #e8e6e0",
                background: activeCase === c.label ? "#000" : "#fff", 
                color: activeCase === c.label ? "#fff" : "#555",
                transition: "all 0.2s",
                boxShadow: activeCase === c.label ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, position: "relative" }}>
        {loading && (
          <div style={{ 
            position: "absolute", inset: 0, background: "rgba(248, 247, 244, 0.7)", 
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, borderRadius: 12,
            fontSize: 14, fontWeight: 700, color: "#000"
          }}>
            Computing...
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
          <div style={{ fontSize: 32, fontWeight: 800, color: isApproved(result?.original?.prediction || "1") ? "#22c55e" : "#dc2626" }}>
            {result ? (isApproved(result.original?.prediction || "1") ? "Approved" : "Rejected") : "..."}
          </div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4, fontWeight: 500 }}>
            {result?.original?.confidence || "—"}% confidence
          </div>
        </div>

        {/* Counterfactual */}
        <div style={{ 
          background: result?.outcome_changed ? "#fef2f2" : "#fff", 
          border: result?.outcome_changed ? "2px solid #fca5a5" : "1px solid #e8e6e0",
          borderRadius: 16, padding: 20, opacity: result ? 1 : 0.3
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 12 }}>
            IF {activeCase.split(":")[0]?.toUpperCase() || "DEMO"} — same everything else
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: isApproved(result?.counterfactual?.prediction || "1") ? "#22c55e" : "#dc2626" }}>
            {result ? (isApproved(result.counterfactual?.prediction || "1") ? "Approved" : "Rejected") : "..."}
          </div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4, fontWeight: 500 }}>
            {result?.counterfactual?.confidence || "—"}% confidence
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
            : `Outcome remains unchanged when switching ${(result.flip_column || "attribute").toLowerCase()}. This suggests the model is robust to bias for this specific attribute change.`}
        </div>
      )}
    </div>
  );
}