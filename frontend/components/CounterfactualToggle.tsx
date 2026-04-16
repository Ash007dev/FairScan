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
  const [selectedCol, setSelectedCol] = useState(sensitiveColumns[0] || "");
  const [result, setResult] = useState<CounterfactualResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get unique values for the selected column from the sample row
  // In real use these come from the dataset — here we use common known values as fallback
  const COMMON_VALUES: Record<string, string[]> = {
    sex: ["Male", "Female"],
    gender: ["Male", "Female"],
    race: ["White", "Black", "Asian", "Other"],
    "marital-status": ["Married", "Single", "Divorced"],
  };

  const colKey = selectedCol.toLowerCase().replace(/[_\-\s]/g, "");
  const groupValues = COMMON_VALUES[colKey] || COMMON_VALUES[selectedCol] || ["Group A", "Group B"];

  async function flip(to: string) {
    const from = sampleRow[selectedCol] || groupValues[0];
    if (to === from) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/counterfactual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row: sampleRow,
          flip_column: selectedCol,
          flip_to: to,
          model_data: modelData,
        }),
      });
      if (!res.ok) throw new Error("Counterfactual request failed");
      const data: CounterfactualResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const isApproved = (pred: string) =>
    pred === "1" || pred.toLowerCase().includes("approv") || pred.toLowerCase().includes(">50k");

  return (
    <div style={{ background: "#f8f7f4", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 10 }}>
        SELECT ATTRIBUTE TO FLIP — EVERYTHING ELSE STAYS THE SAME
      </div>

      {/* Column selector */}
      {sensitiveColumns.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {sensitiveColumns.map(col => (
            <button key={col} onClick={() => { setSelectedCol(col); setResult(null); }} style={{
              padding: "5px 12px", borderRadius: 7, fontSize: 11, cursor: "pointer",
              border: selectedCol === col ? "2px solid #1d4ed8" : "1px solid #e0dedd",
              background: selectedCol === col ? "#eff6ff" : "#fff",
              color: selectedCol === col ? "#1e40af" : "#666", fontWeight: selectedCol === col ? 700 : 400
            }}>
              {col}
            </button>
          ))}
        </div>
      )}

      {/* Group toggle buttons */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {groupValues.map(val => (
          <button key={val} onClick={() => flip(val)} disabled={loading} style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 12, cursor: loading ? "not-allowed" : "pointer",
            border: "1px solid #e0dedd", background: "#fff", color: "#555",
            fontWeight: 500, transition: "all .15s"
          }}>
            {selectedCol}: {val}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: "#888", fontSize: 13, padding: "12px 0" }}>
          Recomputing prediction...
        </div>
      )}

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#dc2626" }}>
          {error}
        </div>
      )}

      {result && !loading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {/* Before */}
            <div style={{ background: "#f0f0ee", borderRadius: 10, padding: 14, border: "1px solid #e0dedd" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 8 }}>
                ORIGINAL ({result.original.attribute_value})
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: isApproved(result.original.prediction) ? "#16a34a" : "#dc2626" }}>
                {result.original.prediction}
              </div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>
                {result.original.confidence}% confidence
              </div>
            </div>

            {/* After */}
            <div style={{
              borderRadius: 10, padding: 14,
              background: result.outcome_changed
                ? (isApproved(result.counterfactual.prediction) ? "#f0fdf4" : "#fef2f2")
                : "#f8f7f4",
              border: result.outcome_changed
                ? (isApproved(result.counterfactual.prediction) ? "2px solid #4ade80" : "2px solid #f87171")
                : "1px solid #e0dedd"
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 8 }}>
                IF {selectedCol.toUpperCase()} = {result.counterfactual.attribute_value}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: isApproved(result.counterfactual.prediction) ? "#16a34a" : "#dc2626" }}>
                {result.counterfactual.prediction}
              </div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>
                {result.counterfactual.confidence}% confidence
              </div>
            </div>
          </div>

          {result.outcome_changed ? (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 13px", fontSize: 12, color: "#991b1b", fontWeight: 600 }}>
              Outcome changed solely because of {result.flip_column}. All other attributes identical. This is direct evidence of bias.
            </div>
          ) : (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 13px", fontSize: 12, color: "#15803d", fontWeight: 500 }}>
              Outcome unchanged by this attribute change. Confidence shifted by {result.delta_confidence}%.
            </div>
          )}
        </>
      )}
    </div>
  );
}