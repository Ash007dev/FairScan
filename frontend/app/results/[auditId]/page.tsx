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
  age: 35,
  workclass: "Private",
  education: "Bachelors",
  "education-num": 13,
  "marital-status": "Married-civ-spouse",
  occupation: "Exec-managerial",
  relationship: "Husband",
  race: "White",
  sex: "Male",
  "capital-gain": 0,
  "capital-loss": 0,
  "hours-per-week": 45,
  "native-country": "United-States",
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
    <main style={{ minHeight: "100vh", background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ fontSize: 14, color: "#888" }}>Loading results...</div>
    </main>
  );

  if (error) return (
    <main style={{ minHeight: "100vh", background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "20px 28px", maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontSize: 14, color: "#dc2626", marginBottom: 12 }}>{error}</div>
        <a href="/" style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>← Start new audit</a>
      </div>
    </main>
  );

  if (!result) return null;

  const violationCount = result.legal?.violations?.length || 0;
  const highCount = result.legal?.violations?.filter(v => v.risk_level === "high").length || 0;
  const medCount = result.legal?.violations?.filter(v => v.risk_level === "medium").length || 0;

  return (
    <main style={{ background: "#f5f4f0", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e8e6e0", padding: "0 20px", height: 50, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#111", letterSpacing: -0.5 }}>
          Fair<span style={{ color: "#dc2626" }}>Scan</span>
        </span>
        <span style={{ marginLeft: 12, fontSize: 11, color: "#bbb", flex: 1 }}>
          {result.model_name} &nbsp;·&nbsp; {result.stat?.row_count?.toLocaleString()} rows &nbsp;·&nbsp; complete
        </span>
        <a
          href={getPdfUrl(auditId)}
          target="_blank"
          rel="noreferrer"
          style={{ padding: "7px 14px", background: "#111", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}
        >
          Download PDF
        </a>
      </nav>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px" }}>

        {/* Top metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 6 }}>FAIRNESS SCORE</div>
            <FairnessGauge score={result.fairness_score} />
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 6 }}>ROWS ANALYSED</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#111", letterSpacing: -1 }}>
              {result.stat?.row_count?.toLocaleString() || "—"}
            </div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
              {result.stat?.sensitive_columns?.length || 0} sensitive cols found
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 6 }}>VIOLATIONS</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: violationCount > 0 ? "#dc2626" : "#16a34a", letterSpacing: -1 }}>
              {violationCount}
            </div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
              {highCount} high · {medCount} medium risk
            </div>
          </div>
        </div>

        {/* Bias Heatmap */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, padding: 18, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 14 }}>
            BIAS HEATMAP — approval rate by demographic group
          </div>
          <BiasHeatmap resultsPerGroup={result.stat?.results_per_group || {}} />
        </div>

        {/* Root Cause Chart */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, padding: 18, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 14 }}>
            ROOT CAUSE — which column drives the bias (feature importance)
          </div>
          <RootCauseChart
            featureRanking={result.root_cause?.feature_ranking || []}
            topDriver={result.root_cause?.top_bias_driver || ""}
          />
          {result.root_cause?.explanation && (
            <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6, marginTop: 12, padding: "10px 12px", background: "#f8f7f4", borderRadius: 8 }}>
              {result.root_cause.explanation}
            </div>
          )}
        </div>

        {/* Legal Violations */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, padding: 18, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 14 }}>
            LEGAL MAPPER — regulatory violations found
          </div>
          {result.legal?.violations?.length > 0 ? (
            result.legal.violations.map((v, i) => (
              <LegalBadge key={i} violation={v} />
            ))
          ) : (
            <div style={{ fontSize: 13, color: "#16a34a" }}>No violations detected.</div>
          )}
        </div>

        {/* Compliance Memo */}
        {result.report?.memo && (
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, padding: 18, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 14 }}>
              COMPLIANCE MEMO — plain English for your team
            </div>
            <div style={{ fontSize: 13, color: "#333", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {result.report.memo}
            </div>
          </div>
        )}

        {/* Counterfactual Toggle */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 14, padding: 18, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 4 }}>
            COUNTERFACTUAL — what if this applicant were...
          </div>
          <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, marginBottom: 14 }}>
            The demo moment — flip one attribute and watch the decision change
          </div>
          <CounterfactualToggle
            sampleRow={DEMO_SAMPLE_ROW}
            sensitiveColumns={result.sensitive_columns || result.stat?.sensitive_columns || ["sex"]}
            modelData={result.root_cause?.model_data || ""}
          />
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 11, color: "#ccc", paddingBottom: 24 }}>
          Powered by Google Gemini · fairlearn · SHAP · Built for Google AI Hackathon 2026
        </div>

      </div>
    </main>
  );
}