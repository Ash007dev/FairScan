"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const stored = JSON.parse(localStorage.getItem("fairscan_history") || "[]");
      setHistory(stored);
      // Auto-select the first two if available
      if (stored.length >= 2) {
        setSelected([stored[0].audit_id, stored[1].audit_id]);
      } else if (stored.length === 1) {
        setSelected([stored[0].audit_id]);
      }
    } catch (e) {}
  }, []);

  if (!isClient) return null;

  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1], id]; // Keep the last selected and add the new one
    });
  }

  const compA = history.find(h => h.audit_id === selected[0]);
  const compB = history.find(h => h.audit_id === selected[1]);

  return (
    <main style={{ minHeight: "100vh", background: "#000000", fontFamily: "'Space Grotesk', sans-serif", color: "#f0f0ff", padding: "40px 24px" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 900, margin: "0 auto 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
            ← Back
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Audit History</h1>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 32 }}>
        {/* Left side: History List */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: ".1em", marginBottom: 16 }}>
            RECENT AUDITS (SELECT 2)
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 24, background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.1)", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
              No audits found in this browser.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {history.map(item => {
                const isSel = selected.includes(item.audit_id);
                return (
                  <div
                    key={item.audit_id}
                    onClick={() => toggleSelect(item.audit_id)}
                    style={{
                      padding: 16, borderRadius: 16, cursor: "pointer", transition: "all 0.2s",
                      background: isSel ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.03)",
                      border: isSel ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, wordBreak: "break-word" }}>{item.model_name}</div>
                      <div style={{
                        padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 800, flexShrink: 0,
                        background: item.fairness_score < 50 ? "rgba(248,113,113,0.15)" : item.fairness_score < 75 ? "rgba(251,191,36,0.15)" : "rgba(16,185,129,0.15)",
                        color: item.fairness_score < 50 ? "#f87171" : item.fairness_score < 75 ? "#fbbf24" : "#10b981"
                      }}>
                        {item.fairness_score}/100
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                      <span>{item.violation_count} issues</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side: Comparison */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: ".1em", marginBottom: 16 }}>
            SIDE-BY-SIDE COMPARISON
          </div>
          {selected.length < 2 ? (
            <div style={{ padding: 40, background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.1)", textAlign: "center", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
              Select two audits from the left to compare their metrics.
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", tableLayout: "fixed" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th style={{ padding: 16, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", width: "30%" }}>Metric</th>
                    <th style={{ padding: 16, fontSize: 14, fontWeight: 700, width: "35%", borderRight: "1px solid rgba(255,255,255,0.03)" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{compA?.model_name}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, fontWeight: 500 }}>{new Date(compA?.timestamp).toLocaleString()}</div>
                    </th>
                    <th style={{ padding: 16, fontSize: 14, fontWeight: 700, width: "35%" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{compB?.model_name}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, fontWeight: 500 }}>{new Date(compB?.timestamp).toLocaleString()}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Fairness Score", k: "fairness_score", higherIsBetter: true },
                    { label: "Legal Violations", k: "violation_count", higherIsBetter: false },
                    { label: "DP Difference", k: "dp_diff", higherIsBetter: false },
                    { label: "Rows Analysed", k: "row_count", higherIsBetter: null },
                  ].map((row, i) => {
                    const valA = compA?.[row.k];
                    const valB = compB?.[row.k];
                    
                    let diffUi = null;
                    if (row.higherIsBetter !== null && valA !== "N/A" && valB !== "N/A" && valA !== undefined && valB !== undefined) {
                      const numA = Number(valA);
                      const numB = Number(valB);
                      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
                        const bIsBetter = row.higherIsBetter ? numB > numA : numB < numA;
                        const diff = Math.abs(numB - numA);
                        const color = bIsBetter ? "#10b981" : "#f87171";
                        const sign = numB > numA ? "+" : "-";
                        diffUi = (
                          <span style={{ color, fontSize: 11, fontWeight: 800, marginLeft: 6, padding: "2px 6px", background: `${color}20`, borderRadius: 4, whiteSpace: "nowrap" }}>
                            {sign}{Number.isInteger(diff) ? diff : diff.toFixed(4)}
                          </span>
                        );
                      }
                    }

                    return (
                      <tr key={row.label} style={{ borderBottom: i === 3 ? "none" : "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: 16, fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{row.label}</td>
                        <td style={{ padding: 16, fontSize: 15, fontWeight: 700, borderRight: "1px solid rgba(255,255,255,0.03)", wordBreak: "break-word" }}>{valA}</td>
                        <td style={{ padding: 16, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                          {valB} {diffUi}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => router.push(`/results/${compA?.audit_id}`)} style={{ fontSize: 12, fontWeight: 700, color: "#a855f7", background: "none", border: "none", cursor: "pointer" }}>View Audit 1 →</button>
                <button onClick={() => router.push(`/results/${compB?.audit_id}`)} style={{ fontSize: 12, fontWeight: 700, color: "#06d6f0", background: "none", border: "none", cursor: "pointer" }}>View Audit 2 →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
