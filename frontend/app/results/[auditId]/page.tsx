"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuditResult, AuditStatus } from "@/lib/types";
import { LegalBadge } from "@/components/LegalBadge";
import { CounterfactualToggle } from "@/components/CounterfactualToggle";
import { BiasHeatmap } from "@/components/BiasHeatmap";
import { RootCauseChart } from "@/components/RootCauseChart";
import { getPdfUrl } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Fallback sample row for counterfactual demo
// Used if /demo/sample-row endpoint fails
const FALLBACK_ROW: Record<string, any> = {
  age: "38",
  workclass: "Private",
  education: "HS-grad",
  "education-num": "12",
  "marital-status": "Married-civ-spouse",
  occupation: "Sales",
  relationship: "Husband",
  race: "White",
  sex: "Male",
  "capital-gain": "0",
  "capital-loss": "0",
  "hours-per-week": "45",
  "native-country": "United-States"
};

export default function ResultsPage() {
  const params = useParams();
  const auditId = params?.auditId as string;
  const router = useRouter();

  const [result, setResult] = useState<AuditResult | null>(null);
  const [sampleRow, setSampleRow] = useState<Record<string, any>>(FALLBACK_ROW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`${API_URL}/audit/${auditId}/status`);
        
        // If 404 (audit not found, server restarted, etc), redirect to home
        if (res.status === 404) {
          router.push('/');
          return;
        }

        const data: AuditStatus = await res.json();

        if (data.status === "complete" && data.result) {
          setResult(data.result);
        } else if (data.status === "running") {
          // Still running — redirect back to loading page
          router.push(`/loading/${auditId}`);
          return;
        } else if (data.status === "error") {
          setError(data.message || "Audit failed");
        } else {
          router.push('/');
          return;
        }
      } catch {
        setError("Could not load results. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }

    // Also try to fetch a real sample row from the backend
    async function fetchSampleRow() {
      try {
        const res = await fetch(`${API_URL}/demo/sample-row`);
        if (res.ok) {
          const data = await res.json();
          setSampleRow(data);
        }
      } catch {
        // Use fallback row — no problem
      }
    }

    fetchResult();
    fetchSampleRow();
  }, [auditId, router]);

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
        {error || "The audit session was lost. Please run a new audit."}
      </p>
      <button 
        onClick={() => window.location.href = "/"}
        style={{ 
          padding: "12px 24px", background: "#000", color: "#fff", 
          border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer" 
        }}
      >
        &larr; Return to Upload
      </button>
    </main>
  );

  const violationCount = result.legal?.violations?.length || 0;
  const highCount = result.legal?.violations?.filter(v => v.risk_level === "high").length || 0;
  const medCount = result.legal?.violations?.filter(v => v.risk_level === "medium").length || 0;

  const scoreColor = result.fairness_score < 50 ? "#dc2626" : result.fairness_score < 75 ? "#d97706" : "#16a34a";
  const scoreLabel = result.fairness_score < 50 ? "Critical · action required" : result.fairness_score < 75 ? "Warning · remediation recommended" : "Healthy · no action";

  return (
    <main style={{ background: "#f5f4f0", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e8e6e0", padding: "0 32px", height: 72, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>
          Fair<span style={{ color: "#dc2626" }}>Scan</span>
        </span>
        <span style={{ marginLeft: 16, fontSize: 13, color: "#bbb", flex: 1, fontWeight: 500 }}>
          {result.model_name} &nbsp;&middot;&nbsp; {result.stat?.row_count?.toLocaleString()} rows &nbsp;&middot;&nbsp; complete
        </span>
        <a
          href={getPdfUrl(auditId)}
          target="_blank"
          rel="noreferrer"
          style={{ padding: "10px 20px", background: "#0f0f0e", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none" }}
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
              <div style={{ fontSize: 44, fontWeight: 800, color: scoreColor, letterSpacing: -2 }}>
                {result.fairness_score}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#ccc" }}>/100</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor, marginTop: 4 }}>
              {scoreLabel}
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 12 }}>ROWS ANALYSED</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: "#111", letterSpacing: -2 }}>
              {(result.stat?.row_count || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 4, fontWeight: 500 }}>
              {result.stat?.sensitive_columns?.length || 0} sensitive columns found
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#bbb", letterSpacing: ".06em", marginBottom: 12 }}>VIOLATIONS FOUND</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: violationCount > 0 ? "#dc2626" : "#16a34a", letterSpacing: -2 }}>
              {violationCount}
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 4, fontWeight: 500 }}>
              {highCount} high &middot; {medCount} medium risk
            </div>
          </div>
        </div>

        {/* Audit Quality Validation */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 16, padding: "16px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: result.validation_warnings?.length ? "#fef2f2" : "#f0fdf4", color: result.validation_warnings?.length ? "#dc2626" : "#16a34a", padding: "6px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
            {result.validation_warnings?.length ? "⚠️ Audit Quality Warning" : "✓ 4 agents cross-checked"}
          </div>
          <div style={{ fontSize: 14, color: "#444", fontWeight: 500 }}>
            {result.validation_warnings?.length 
              ? `${result.validation_warnings.length} inconsistencies found: ${result.validation_warnings.map(w => w.message).join(' ')}`
              : "0 inconsistencies found across statistical, causal, and legal models."}
          </div>
        </div>

        {/* Bias Heatmap */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 16 }}>
            BIAS HEATMAP · approval rate by group
          </div>
          <BiasHeatmap resultsPerGroup={result.stat?.results_per_group || {}} />
        </div>

        {/* Root Cause Chart */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 16 }}>
            ROOT CAUSE · which column drives the bias (SHAP importance)
          </div>
          <RootCauseChart
            featureRanking={result.root_cause?.feature_ranking || []}
            topDriver={result.root_cause?.top_bias_driver || ""}
          />
        </div>

        {/* Legal Violations */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 16 }}>
            LEGAL MAPPER · regulatory violations
          </div>
          {(result.legal?.violations?.length || 0) > 0 ? (
            (result.legal?.violations || []).map((v, i) => (
              <LegalBadge key={i} violation={v} />
            ))
          ) : (
            <div style={{ fontSize: 14, color: "#16a34a", fontWeight: 600 }}>No violations detected.</div>
          )}
        </div>

        {/* Compliance Memo */}
        {result.report?.memo && (
          <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, padding: 32, marginBottom: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#111", letterSpacing: ".08em", marginBottom: 24, borderBottom: "2px solid #f0f0f0", paddingBottom: 16 }}>
              COMPLIANCE MEMO <span style={{ color: "#aaa", fontWeight: 500, marginLeft: 8 }}>Plain English summary for your team</span>
            </div>
            <div className="memo-content" style={{ fontSize: 15, color: "#333", fontWeight: 450 }}>
              {result.report.memo.replace(/--/g, "—").split('\n').map((line, idx, arr) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={idx} style={{ height: 16 }} />;
                
                // Headings (e.g. "EXECUTIVE SUMMARY:")
                if (trimmed.endsWith(':') && trimmed.toUpperCase() === trimmed) {
                  // Title case the heading
                  const titleCased = trimmed.slice(0, -1).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                  return (
                    <div key={idx} style={{ fontSize: 14, fontWeight: 800, color: "#111", letterSpacing: ".04em", marginTop: 32, marginBottom: 12, textTransform: "uppercase" }}>
                      {titleCased}
                    </div>
                  );
                }

                // Bullet points
                if (trimmed.startsWith('* ')) {
                  return (
                    <div key={idx} style={{ display: "flex", gap: 12, marginBottom: 10, lineHeight: 1.6, color: "#444" }}>
                      <span style={{ color: "#dc2626", fontWeight: 800 }}>•</span>
                      <span>{trimmed.substring(2)}</span>
                    </div>
                  );
                }

                // Numbered list
                const numMatch = trimmed.match(/^(\d+\.)\s(.*)/);
                if (numMatch) {
                  return (
                    <div key={idx} style={{ display: "flex", gap: 12, marginBottom: 12, lineHeight: 1.6, color: "#444", background: "#fafaf9", padding: "12px 16px", borderRadius: 8, border: "1px solid #f0f0f0" }}>
                      <span style={{ fontWeight: 800, color: "#111" }}>{numMatch[1]}</span>
                      <span>{numMatch[2]}</span>
                    </div>
                  );
                }

                // Regular text
                return (
                  <div key={idx} style={{ lineHeight: 1.8, color: "#555", marginBottom: 8 }}>
                    {trimmed}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Counterfactual Toggle */}
        <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 20, padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".06em", marginBottom: 6 }}>
            COUNTERFACTUAL · the demo moment
          </div>
          <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginBottom: 16, background: "#fef2f2", display: "inline-block", padding: "4px 10px", borderRadius: 6 }}>
            flip one attribute, watch the outcome change
          </div>
          <CounterfactualToggle
            sampleRow={sampleRow}
            sensitiveColumns={result.sensitive_columns || result.stat?.sensitive_columns || ["sex"]}
            modelData={result.root_cause?.model_data || ""}
          />
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 12, color: "#bbb", paddingBottom: 44, fontWeight: 500 }}>
          Powered by Google Gemini 1.5 Pro &middot; Fairlearn &middot; SHAP &middot; Built for Google AI Hackathon 2026
        </div>

      </div>
    </main>
  );
}