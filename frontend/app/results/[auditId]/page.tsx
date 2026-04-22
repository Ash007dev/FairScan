"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuditResult, AuditStatus } from "@/lib/types";
import { LegalBadge } from "@/components/LegalBadge";
import { CounterfactualToggle } from "@/components/CounterfactualToggle";
import { BiasHeatmap } from "@/components/BiasHeatmap";
import { RootCauseChart } from "@/components/RootCauseChart";
import { FairnessGauge } from "@/components/FairnessGauge";
import { getPdfUrl } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// A hardcoded sample row for the counterfactual demo
// In production this would come from the dataset
const DEMO_SAMPLE_ROW: Record<string, any> = {
  age: 38,
  sex: "Male",
  race: "White",
  "workclass": "Private",
  "education": "HS-grad",
  "marital-status": "Married-civ-spouse",
  "occupation": "Sales",
  "relationship": "Husband",
  "capital-gain": 0,
  "capital-loss": 0,
  "hours-per-week": 40,
  "native-country": "United-States"
};

export default function ResultsPage() {
  const params = useParams();
  const auditId = params.auditId as string;

  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`${API_URL}/audit/${auditId}/status`);
        const data: AuditStatus = await res.json();

        if (data.status === "complete" && data.result) {
          setResult(data.result);
        } else if (data.status === "error") {
          setError(data.message || "Audit failed");
        } else {
          setError("Audit is not complete yet. Go back and wait for it to finish.");
        }
      } catch {
        setError("Could not load results. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }

    fetchResult();
  }, [auditId]);

  if (loading) return (
    <main style={{ minHeight: "100vh", background: "#f5f4f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #e8e6e0", borderTopColor: "#000", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 16 }} />
      <div style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>Finalizing report...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );

  if (error || !result) return (
    <main style={{ 
      minHeight: "100vh", background: "#f5f4f0", fontFamily: "system-ui, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 
    }}>
      <div style={{ fontSize: 48, marginBottom: 24 }}>🔄</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 8 }}>Session Expired</h2>
      <p style={{ fontSize: 16, color: "#666", marginBottom: 32, textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        {error.includes("complete") 
          ? "This audit is still processing. Please wait for the agents to finish their work."
          : "The audit session was lost (possibly due to a server restart). Your data is safe, but you'll need to run the audit again to see the live results."}
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button 
          onClick={() => window.location.href = "/"}
          style={{ 
            padding: "12px 24px", background: "#000", color: "#fff", 
            border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer" 
          }}
        >
          ← Return to Upload
        </button>
      </div>
    </main>
  );

  const violationCount = result.legal?.violations?.length || 0;
  const highCount = result.legal?.violations?.filter(v => v.risk_level === "high").length || 0;
  const medCount = result.legal?.violations?.filter(v => v.risk_level === "medium").length || 0;

  return (
    <main style={{ background: "#f5f4f0", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e8e6e0", padding: "0 32px", height: 72, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>
          Fair<span style={{ color: "#dc2626" }}>Scan</span>
        </span>
        <span style={{ marginLeft: 16, fontSize: 13, color: "#bbb", flex: 1, fontWeight: 500 }}>
          {result.model_name} &nbsp;·&nbsp; {result.stat?.row_count?.toLocaleString()} rows &nbsp;·&nbsp; complete
        </span>
        <a
          href={getPdfUrl(auditId)}
          target="_blank"
          rel="noreferrer"
          style={{ padding: "10px 20px", background: "#111", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}
        >
          Download PDF report
        </a>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>

        {/* Top metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 12 }}>FAIRNESS SCORE</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: result.fairness_score < 50 ? "#dc2626" : "#22c55e", letterSpacing: -2 }}>
                {result.fairness_score}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#ccc" }}>/100</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: result.fairness_score < 50 ? "#dc2626" : result.fairness_score < 80 ? "#b45309" : "#22c55e", marginTop: 4 }}>
              {result.fairness_score < 50 ? "Critical — action required" : result.fairness_score < 80 ? "Warning — remediation recommended" : "Healthy — no action"}
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 12 }}>ROWS ANALYSED</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: "#111", letterSpacing: -2 }}>
              {(result.stat?.row_count || 0) > 1000 ? `${(result.stat!.row_count / 1000).toFixed(1)}k` : result.stat?.row_count}
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 4, fontWeight: 500 }}>
              15 columns · {result.stat?.sensitive_columns?.length || 0} sensitive
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 12 }}>VIOLATIONS FOUND</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: violationCount > 0 ? "#dc2626" : "#22c55e", letterSpacing: -2 }}>
              {violationCount}
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 4, fontWeight: 500 }}>
              {highCount} high · {medCount} medium risk
            </div>
          </div>
        </div>

        {/* Bias Heatmap */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 16 }}>
            BIAS HEATMAP — approval rate by group
          </div>
          <BiasHeatmap resultsPerGroup={result.stat?.results_per_group || {}} />
        </div>

        {/* Root Cause Chart */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 16 }}>
            ROOT CAUSE — which column drives the bias (SHAP importance)
          </div>
          <RootCauseChart
            featureRanking={result.root_cause?.feature_ranking || []}
            topDriver={result.root_cause?.top_bias_driver || ""}
          />
        </div>

        {/* Legal Violations */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 16 }}>
            LEGAL MAPPER — regulatory violations
          </div>
          {result.legal?.violations?.length > 0 ? (
            result.legal.violations.map((v, i) => (
              <LegalBadge key={i} violation={v} />
            ))
          ) : (
            <div style={{ fontSize: 14, color: "#16a34a", fontWeight: 600 }}>No violations detected.</div>
          )}
        </div>

        {/* Compliance Memo */}
        {result.report?.memo && (
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 20 }}>
              COMPLIANCE MEMO — plain English for your team
            </div>
            <div style={{ fontSize: 15, color: "#333", lineHeight: 1.8, whiteSpace: "pre-wrap", fontWeight: 450 }}>
              {result.report.memo}
            </div>
          </div>
        )}

        {/* Counterfactual Toggle */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 6 }}>
            COUNTERFACTUAL — the demo moment
          </div>
          <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginBottom: 16, background: "#fef2f2", display: "inline-block", padding: "4px 10px", borderRadius: 6 }}>
            flip one attribute, watch extreme change
          </div>
          <CounterfactualToggle
            sampleRow={DEMO_SAMPLE_ROW}
            sensitiveColumns={result.sensitive_columns || result.stat?.sensitive_columns || ["sex"]}
            modelData={result.root_cause?.model_data || ""}
          />
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 12, color: "#bbb", paddingBottom: 44, fontWeight: 500 }}>
          Powered by Google Gemini 1.5 Pro · fairlearn · SHAP · Built for Google AI Hackathon 2026
        </div>

      </div>
    </main>
  );
}