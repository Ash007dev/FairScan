"use client";

import { useState } from "react";
import { CounterfactualResponse } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  sampleRow: Record<string, any>;
  sensitiveColumns: string[];
  modelData: string;
  resultsPerGroup: Record<string, { groups: Record<string, number> }>;
}

export function CounterfactualToggle({ sampleRow, sensitiveColumns, modelData, resultsPerGroup }: Props) {
  const [result, setResult] = useState<CounterfactualResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCase, setActiveCase] = useState("");
  const [error, setError] = useState("");

  // Build toggle cases dynamically from whatever columns the backend detected.
  // For each sensitive column, find its known group values from resultsPerGroup,
  // then create one "from → to" button per pair of distinct values.
  const CASES = sensitiveColumns.flatMap(col => {
    // Find the column in resultsPerGroup (case-insensitive match)
    const groupKey = Object.keys(resultsPerGroup).find(k => k.toLowerCase() === col.toLowerCase());
    const groups = groupKey ? Object.keys(resultsPerGroup[groupKey].groups) : [];

    if (groups.length < 2) return [];

    // Build one button per value: "Col: CurrentValue → OtherValue"
    // Only show flips that are relevant (from the current sample row value to each other value)
    const currentVal = String(sampleRow[col] ?? sampleRow[Object.keys(sampleRow).find(k => k.toLowerCase() === col.toLowerCase()) ?? ""] ?? groups[0]);

    return groups
      .filter(g => g !== currentVal)
      .map(toVal => ({
        label: `${col.charAt(0).toUpperCase() + col.slice(1)}: ${currentVal} → ${toVal}`,
        col,
        from: currentVal,
        to: toVal,
      }));
  });

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
    
    // Fix correlated field mismatch for the Demo dataset
    // (If we force sex to Female, we must force relationship to Wife, otherwise the model sees "Female Husband")
    if (c.col.toLowerCase() === "sex" && sampleRow.relationship) {
      if (String(c.from).toLowerCase() === "female" && baseRow.relationship.toLowerCase() === "husband") {
        baseRow.relationship = "Wife";
      } else if (String(c.from).toLowerCase() === "male" && baseRow.relationship.toLowerCase() === "wife") {
        baseRow.relationship = "Husband";
      }
    }
    
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

  const profileSummary = [
    sampleRow.age ? `${sampleRow.age}yo` : null,
    sampleRow.education,
    sampleRow.occupation,
    sampleRow["hours-per-week"] ? `${sampleRow["hours-per-week"]} hrs/wk` : null
  ].filter(Boolean).join(" · ");

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.08)" }}>
      {profileSummary && (
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>👤</span> Profile: <span style={{ color: "rgba(255,255,255,0.6)" }}>{profileSummary}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {CASES.length === 0 ? (
          <div style={{ fontSize: 13, color: "#aaa", fontWeight: 500 }}>
            No sensitive column values found to toggle. Run the demo dataset for the best experience.
          </div>
        ) : CASES.map(c => (
            <button
              key={c.label}
              onClick={() => runCase(c)}
              disabled={loading}
              style={{
                padding: "10px 18px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                border: activeCase === c.label ? "2px solid #a855f7" : "1px solid rgba(255,255,255,0.1)",
                background: activeCase === c.label ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.05)",
                color: activeCase === c.label ? "#c084fc" : "rgba(255,255,255,0.6)",
                transition: "all 0.2s",
                opacity: loading && activeCase !== c.label ? 0.4 : 1,
                boxShadow: activeCase === c.label ? "0 0 16px rgba(168,85,247,0.4)" : "none"
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

      {error && (
        <div style={{
          marginBottom: 16, padding: "12px 16px", borderRadius: 12,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171",
          fontSize: 13, fontWeight: 600
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, position: "relative" }}>
        {loading && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(5,5,15,0.7)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, borderRadius: 12,
            fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)"
          }}>
            ⚡ Recomputing...
          </div>
        )}

        {/* Original */}
        <div style={{
          background: "rgba(255,255,255,0.03)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, opacity: result ? 1 : 0.3
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: ".1em", marginBottom: 12 }}>
            ORIGINAL ({result?.original?.attribute_value || ""})
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: result ? (isApproved(result.original?.prediction) ? "#10b981" : "#f87171") : "rgba(255,255,255,0.1)" }}>
            {result ? formatPrediction(result.original?.prediction) : "..."}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 6, fontWeight: 500 }}>
            {result?.original?.confidence ?? 0}% confidence
          </div>
        </div>

        {/* Counterfactual */}
        <div style={{
          background: result?.outcome_changed ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.03)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          border: result?.outcome_changed ? "2px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: 20, opacity: result ? 1 : 0.3
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: ".1em", marginBottom: 12 }}>
            IF {result?.counterfactual?.attribute_value?.toUpperCase() || activeCase.split("→")[1]?.trim()?.toUpperCase() || "FLIPPED"}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: result ? (isApproved(result.counterfactual?.prediction) ? "#10b981" : "#f87171") : "rgba(255,255,255,0.1)" }}>
            {result ? formatPrediction(result.counterfactual?.prediction) : "..."}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 6, fontWeight: 500 }}>
            {result?.counterfactual?.confidence ?? 0}% confidence
          </div>
        </div>
      </div>

      {result && (
        <div style={{
          marginTop: 18, padding: "14px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700, lineHeight: 1.6,
          background: result.outcome_changed ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
          border: `1px solid ${result.outcome_changed ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
          color: result.outcome_changed ? "#f87171" : "#10b981"
        }}>
          {result.outcome_changed
            ? `Outcome changed solely because of ${(result.flip_column || "attribute").toLowerCase()}. Same qualifications — only ${(result.flip_column || "attribute").toLowerCase()} changed. This is direct, provable discrimination.`
            : `Outcome unchanged when switching ${(result.flip_column || "attribute").toLowerCase()}. Confidence shifted by ${result.delta_confidence || 0}%. Model appears robust to this attribute.`}
        </div>
      )}
    </div>
  );
}