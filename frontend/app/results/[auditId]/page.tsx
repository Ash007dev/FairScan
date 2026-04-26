"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuditResult, AuditStatus } from "@/lib/types";
import { LegalBadge } from "@/components/LegalBadge";
import { CounterfactualToggle } from "@/components/CounterfactualToggle";
import { BiasHeatmap } from "@/components/BiasHeatmap";
import { RootCauseChart } from "@/components/RootCauseChart";
import { getPdfUrl } from "@/lib/api";
import {
  LayoutDashboard, BarChart2, GitBranch, Scale, FileText,
  Zap, BookOpen, ChevronLeft, ChevronRight, Download, ArrowLeft, CheckCircle, AlertTriangle, Cpu
} from "@/components/Icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const FALLBACK_ROW: Record<string, any> = {
  age: "38", workclass: "Private", education: "HS-grad", "education-num": "12",
  "marital-status": "Married-civ-spouse", occupation: "Sales", relationship: "Husband",
  race: "White", sex: "Male", "capital-gain": "0", "capital-loss": "0",
  "hours-per-week": "45", "native-country": "United-States"
};

type Section = "overview" | "bias" | "rootcause" | "legal" | "memo" | "counterfactual" | "methodology";

const NAV_ITEMS: { id: Section; icon: React.ReactNode; label: string; sub?: string }[] = [
  { id: "overview",       icon: <LayoutDashboard size={16} />, label: "Overview",       sub: "Score & summary" },
  { id: "bias",           icon: <BarChart2 size={16} />,       label: "Bias Analysis",  sub: "Group disparities" },
  { id: "rootcause",      icon: <GitBranch size={16} />,       label: "Root Cause",     sub: "SHAP features" },
  { id: "legal",          icon: <Scale size={16} />,           label: "Legal Risks",    sub: "Violations" },
  { id: "memo",           icon: <FileText size={16} />,        label: "AI Report",      sub: "Compliance memo" },
  { id: "counterfactual", icon: <Zap size={16} />,             label: "Counterfactual", sub: "The demo moment" },
  { id: "methodology",    icon: <BookOpen size={16} />,        label: "Methodology",    sub: "Glossary & metrics" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: ".14em", marginBottom: 20, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

export default function ResultsPage() {
  const params  = useParams();
  const auditId = params?.auditId as string;
  const router  = useRouter();

  const [result, setResult]         = useState<AuditResult | null>(null);
  const [sampleRow, setSampleRow]   = useState<Record<string, any>>(FALLBACK_ROW);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [active, setActive]         = useState<Section>("overview");
  const [animKey, setAnimKey]       = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function goTo(s: Section) {
    setAnimKey(k => k + 1);
    setActive(s);
  }

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`${API_URL}/audit/${auditId}/status`);
        if (res.status === 404) { router.push("/"); return; }
        const data: AuditStatus = await res.json();
        if (data.status === "complete" && data.result) {
          setResult(data.result);
        } else if (data.status === "running") {
          router.push(`/loading/${auditId}`); return;
        } else if (data.status === "error") {
          setError(data.message || "Audit failed");
        } else {
          router.push("/"); return;
        }
      } catch {
        setError("Could not load results. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }
    async function fetchSampleRow() {
      try {
        const res = await fetch(`${API_URL}/demo/sample-row`);
        if (res.ok) setSampleRow(await res.json());
      } catch {}
    }
    fetchResult();
    fetchSampleRow();
  }, [auditId, router]);

  if (loading) return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #05050f, #0d0a1e)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.06)", borderTopColor: "#a855f7", animation: "spin 1s linear infinite", marginBottom: 16 }} />
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>Finalizing report...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );

  if (error || !result) return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #05050f, #0d0a1e)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>🔄</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: "#f0f0ff", marginBottom: 10 }}>Session Expired</h2>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginBottom: 32, textAlign: "center", maxWidth: 380, lineHeight: 1.7 }}>
        {error || "The audit session was lost. Please run a new audit."}
      </p>
      <button onClick={() => window.location.href = "/"} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #7c3aed, #2563eb)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
        ← Return to Upload
      </button>
    </main>
  );

  const score          = result.fairness_score;
  const violationCount = result.legal?.violations?.length || 0;
  const highCount      = result.legal?.violations?.filter(v => v.risk_level === "high").length || 0;
  const medCount       = result.legal?.violations?.filter(v => v.risk_level === "medium").length || 0;
  const scoreColor     = score < 50 ? "#f87171" : score < 75 ? "#fbbf24" : "#10b981";
  const scoreGlow      = score < 50 ? "rgba(248,113,113,0.25)" : score < 75 ? "rgba(251,191,36,0.2)" : "rgba(16,185,129,0.25)";
  const scoreLabel     = score < 50 ? "Critical" : score < 75 ? "Warning" : "Healthy";

  const SIDEBAR_W = sidebarOpen ? 240 : 68;

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #05050f 0%, #0d0a1e 50%, #050d1a 100%)", fontFamily: "'Space Grotesk', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* ── Top Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 60, zIndex: 100,
        background: "rgba(5,5,15,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", padding: "0 24px", gap: 16
      }}>
        {/* Sidebar toggle */}
        <button onClick={() => setSidebarOpen(o => !o)} style={{
          width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)", cursor: "pointer", color: "rgba(255,255,255,0.5)",
          fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          transition: "all 0.2s"
        }}>
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #a855f7, #06d6f0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Cpu size={14} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5 }}>Fair<span style={{ color: "#a855f7" }}>Scan</span></span>
        </div>

        <div style={{ height: 20, width: 1, background: "rgba(255,255,255,0.08)" }} />

        {/* Model name + row count */}
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {result.model_name} &nbsp;·&nbsp; {result.stat?.row_count?.toLocaleString()} rows
        </span>

        {/* Score pill */}
        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 10,
          padding: "6px 14px", borderRadius: 20,
          background: `rgba(${score < 50 ? "248,113,113" : score < 75 ? "251,191,36" : "16,185,129"},0.1)`,
          border: `1px solid ${scoreColor}30`
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: scoreColor, boxShadow: `0 0 8px ${scoreColor}` }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>{score}/100</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>{scoreLabel}</span>
        </div>

        {/* Download */}
        <a href={getPdfUrl(auditId)} target="_blank" rel="noreferrer"
          style={{
            padding: "8px 18px", background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            borderRadius: 10, color: "#fff", fontSize: 12, fontWeight: 700,
            cursor: "pointer", textDecoration: "none", flexShrink: 0,
            boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
            display: "flex", alignItems: "center", gap: 6
          }}>
          <Download size={13} color="#fff" /> Download Report
        </a>
      </nav>

      <div style={{ display: "flex", paddingTop: 60, minHeight: "100vh" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          position: "fixed", top: 60, left: 0, bottom: 0,
          width: SIDEBAR_W,
          background: "rgba(8,8,20,0.8)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden", zIndex: 90
        }}>

          {/* Audit summary strip */}
          {sidebarOpen && (
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: ".1em", marginBottom: 12 }}>AUDIT SUMMARY</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { val: `${score}`, label: "Score", color: scoreColor },
                  { val: `${violationCount}`, label: "Issues", color: violationCount > 0 ? "#f87171" : "#10b981" },
                  { val: `${result.stat?.sensitive_columns?.length || 0}`, label: "Cols", color: "#06d6f0" },
                ].map(m => (
                  <div key={m.label} style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", padding: "8px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.val}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 3, fontWeight: 600 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nav items */}
          <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
            {NAV_ITEMS.map(item => {
              const isActive = active === item.id;
              // Badge counts for sidebar
              const badge =
                item.id === "legal" && violationCount > 0 ? String(violationCount) :
                item.id === "bias"  && (result.stat?.sensitive_columns?.length || 0) > 0 ? String(result.stat?.sensitive_columns?.length) :
                null;

              return (
                <button key={item.id} onClick={() => goTo(item.id)} style={{
                  width: "100%", display: "flex", alignItems: "center",
                  gap: sidebarOpen ? 12 : 0,
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  padding: sidebarOpen ? "11px 14px" : "12px 0",
                  marginBottom: 4, borderRadius: 12, border: "none", cursor: "pointer",
                  background: isActive ? "rgba(168,85,247,0.15)" : "transparent",
                  boxShadow: isActive ? "0 0 20px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
                  borderLeft: isActive ? "2px solid #a855f7" : "2px solid transparent",
                  transition: "all 0.2s"
                }}>
                  {/* Icon */}
                  <span style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 24, textAlign: "center", flexShrink: 0,
                    color: isActive ? "#c084fc" : "rgba(255,255,255,0.3)",
                    filter: isActive ? "drop-shadow(0 0 6px #a855f7)" : "none",
                    transition: "all 0.2s"
                  }}>
                    {item.icon}
                  </span>

                  {sidebarOpen && (
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#e2d9f3" : "rgba(255,255,255,0.5)", transition: "color 0.2s" }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 1, fontWeight: 500 }}>
                        {item.sub}
                      </div>
                    </div>
                  )}

                  {sidebarOpen && badge && (
                    <span style={{
                      minWidth: 20, height: 20, borderRadius: 6, padding: "0 5px",
                      background: item.id === "legal" ? "rgba(239,68,68,0.2)" : "rgba(6,214,240,0.15)",
                      border: `1px solid ${item.id === "legal" ? "rgba(239,68,68,0.4)" : "rgba(6,214,240,0.3)"}`,
                      color: item.id === "legal" ? "#f87171" : "#06d6f0",
                      fontSize: 10, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>{badge}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom footer in sidebar */}
          {sidebarOpen && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button onClick={() => router.push("/")} style={{
                width: "100%", padding: "9px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}>
                <ArrowLeft size={13} /> New Audit
              </button>
            </div>
          )}
        </aside>

        {/* ── Main Content Area ── */}
        <div style={{
          marginLeft: SIDEBAR_W,
          flex: 1, padding: "36px 40px 80px",
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          maxWidth: `calc(100vw - ${SIDEBAR_W}px)`
        }}>

          {/* Section content with fade animation */}
          <div key={animKey} style={{ animation: "fadeSlideIn 0.35s ease" }}>

            {/* ── OVERVIEW ── */}
            {active === "overview" && (
              <div>
                <SectionLabel>OVERVIEW · AUDIT SNAPSHOT</SectionLabel>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 32, background: "linear-gradient(135deg, #fff, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Audit Complete
                </div>

                {/* Big metric cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                  {/* Score */}
                  <div style={{
                    background: `rgba(${score < 50 ? "248,113,113" : score < 75 ? "251,191,36" : "16,185,129"},0.07)`,
                    border: `1px solid ${scoreColor}30`, borderRadius: 20, padding: "28px 28px",
                    boxShadow: `0 0 40px ${scoreGlow}`, backdropFilter: "blur(20px)"
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: ".12em", marginBottom: 14 }}>FAIRNESS SCORE</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <div style={{ fontSize: 60, fontWeight: 900, color: scoreColor, letterSpacing: -4, lineHeight: 1 }}>{score}</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.15)" }}>/100</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor, marginTop: 10, background: `${scoreColor}20`, padding: "4px 10px", borderRadius: 7, display: "inline-block" }}>
                      {scoreLabel}
                    </div>
                  </div>

                  {/* Rows */}
                  <div style={{ background: "rgba(6,214,240,0.05)", border: "1px solid rgba(6,214,240,0.15)", borderRadius: 20, padding: "28px 28px", backdropFilter: "blur(20px)" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: ".12em", marginBottom: 14 }}>ROWS ANALYSED</div>
                    <div style={{ fontSize: 52, fontWeight: 900, color: "#06d6f0", letterSpacing: -3, lineHeight: 1 }}>
                      {(result.stat?.row_count || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.2)", marginTop: 10 }}>
                      {result.stat?.sensitive_columns?.length || 0} sensitive columns found
                    </div>
                  </div>

                  {/* Violations */}
                  <div style={{
                    background: violationCount > 0 ? "rgba(239,68,68,0.07)" : "rgba(16,185,129,0.07)",
                    border: violationCount > 0 ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(16,185,129,0.2)",
                    borderRadius: 20, padding: "28px 28px", backdropFilter: "blur(20px)"
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: ".12em", marginBottom: 14 }}>VIOLATIONS FOUND</div>
                    <div style={{ fontSize: 52, fontWeight: 900, color: violationCount > 0 ? "#f87171" : "#10b981", letterSpacing: -3, lineHeight: 1 }}>
                      {violationCount}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.2)", marginTop: 10 }}>
                      {highCount} high &middot; {medCount} medium risk
                    </div>
                  </div>
                </div>

                {/* Audit quality */}
                <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "20px 24px", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: result.validation_warnings?.length ? 16 : 0 }}>
                    <div style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: result.validation_warnings?.length ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                      color: result.validation_warnings?.length ? "#f87171" : "#10b981",
                      border: `1px solid ${result.validation_warnings?.length ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`
                    }}>
                      {result.validation_warnings?.length ? "⚠ Quality Warning" : "✓ Cross-validated"}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                      {result.validation_warnings?.length
                        ? `${result.validation_warnings.length} inconsistencies found across agents`
                        : "4 agents agree — zero inconsistencies detected"}
                    </div>
                  </div>
                  {(result.validation_warnings?.length || 0) > 0 && (
                    <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
                      {result.validation_warnings.map((w: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", display: "flex", gap: 8, lineHeight: 1.6 }}>
                          <span style={{ color: "#f87171", fontWeight: 800 }}>•</span>
                          <span>{w.message?.replace(/--/g, "—")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick nav to sections */}
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: ".1em", marginBottom: 12 }}>JUMP TO</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {NAV_ITEMS.filter(n => n.id !== "overview").map(item => (
                    <button key={item.id} onClick={() => goTo(item.id)} style={{
                      padding: "10px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)",
                      cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
                      transition: "all 0.2s"
                    }}>
                      <span style={{ fontSize: 14 }}>{item.icon}</span> {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── BIAS HEATMAP ── */}
            {active === "bias" && (
              <div>
                <SectionLabel>BIAS ANALYSIS · APPROVAL RATE BY GROUP</SectionLabel>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 8, background: "linear-gradient(135deg, #fff, #06d6f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Group Disparities
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 32, lineHeight: 1.7 }}>
                  Approval rates broken down by sensitive demographic groups. Gaps larger than 20pp trigger EEOC adverse impact reporting.
                </p>
                <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 32 }}>
                  <BiasHeatmap resultsPerGroup={result.stat?.results_per_group || {}} />
                </div>
              </div>
            )}

            {/* ── ROOT CAUSE ── */}
            {active === "rootcause" && (
              <div>
                <SectionLabel>ROOT CAUSE · SHAP FEATURE IMPORTANCE</SectionLabel>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 8, background: "linear-gradient(135deg, #fff, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  What drives the bias?
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 32, lineHeight: 1.7 }}>
                  SHAP values show the exact contribution of each feature to the model's predictions. Higher = more influence.
                </p>
                <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 32 }}>
                  <RootCauseChart featureRanking={result.root_cause?.feature_ranking || []} topDriver={result.root_cause?.top_bias_driver || ""} />
                </div>
              </div>
            )}

            {/* ── LEGAL ── */}
            {active === "legal" && (
              <div>
                <SectionLabel>LEGAL MAPPER · REGULATORY VIOLATIONS</SectionLabel>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 8, background: "linear-gradient(135deg, #fff, #f87171)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {violationCount} Violation{violationCount !== 1 ? "s" : ""} Found
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 32, lineHeight: 1.7 }}>
                  {violationCount > 0
                    ? `${highCount} high-risk and ${medCount} medium-risk violations detected. Immediate remediation required.`
                    : "No regulatory violations detected. The model appears to be compliant."}
                </p>
                {violationCount > 0
                  ? (result.legal?.violations || []).map((v, i) => <LegalBadge key={i} violation={v} />)
                  : <div style={{ fontSize: 16, color: "#10b981", fontWeight: 700, padding: "20px 0" }}>✓ No violations detected.</div>
                }
              </div>
            )}

            {/* ── COMPLIANCE MEMO ── */}
            {active === "memo" && (
              <div>
                <SectionLabel>AI REPORT · COMPLIANCE MEMO</SectionLabel>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 8, background: "linear-gradient(135deg, #fff, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Plain-English Summary
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 32, lineHeight: 1.7 }}>
                  Generated by Gemini AI. Written for executives and compliance officers — no technical jargon.
                </p>
                {result.report?.memo ? (
                  <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 36 }}>
                    {result.report.memo.replace(/--/g, "—").split("\n").map((line, idx) => {
                      const trimmed = line.trim();
                      if (!trimmed) return <div key={idx} style={{ height: 12 }} />;
                      if (trimmed.endsWith(":") && trimmed.toUpperCase() === trimmed) {
                        return (
                          <div key={idx} style={{ fontSize: 10, fontWeight: 800, color: "#a855f7", letterSpacing: ".12em", marginTop: 32, marginBottom: 14 }}>
                            {trimmed}
                          </div>
                        );
                      }
                      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
                        const text = trimmed.substring(2).replace(/\*\*/g, "");
                        const ci = text.indexOf(":");
                        return (
                          <div key={idx} style={{ display: "flex", gap: 12, marginBottom: 10, lineHeight: 1.8, color: "rgba(255,255,255,0.45)" }}>
                            <span style={{ color: "#a855f7", fontWeight: 800, flexShrink: 0 }}>•</span>
                            <span style={{ flex: 1 }}>
                              {ci > 0 && ci < 50 ? <><strong style={{ color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>{text.substring(0, ci + 1)}</strong>{text.substring(ci + 1)}</> : text}
                            </span>
                          </div>
                        );
                      }
                      const numMatch = trimmed.match(/^(\d+\.)\s(.*)/);
                      if (numMatch) {
                        const text = numMatch[2].replace(/\*\*/g, "");
                        const ci = text.indexOf(":");
                        return (
                          <div key={idx} style={{ display: "flex", gap: 14, marginBottom: 12, lineHeight: 1.7, background: "rgba(255,255,255,0.03)", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                            <span style={{ fontWeight: 800, color: "#06d6f0", flexShrink: 0 }}>{numMatch[1]}</span>
                            <span style={{ color: "rgba(255,255,255,0.45)" }}>
                              {ci > 0 && ci < 50 ? <><strong style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>{text.substring(0, ci + 1)}</strong>{text.substring(ci + 1)}</> : text}
                            </span>
                          </div>
                        );
                      }
                      return <div key={idx} style={{ lineHeight: 1.8, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontSize: 14 }}>{trimmed.replace(/\*\*/g, "")}</div>;
                    })}
                  </div>
                ) : (
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>No memo generated.</div>
                )}
              </div>
            )}

            {/* ── COUNTERFACTUAL ── */}
            {active === "counterfactual" && (
              <div>
                <SectionLabel>COUNTERFACTUAL · THE DEMO MOMENT</SectionLabel>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 8, background: "linear-gradient(135deg, #fff, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Flip One Attribute
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 12, lineHeight: 1.7 }}>
                  Change a single demographic attribute on a real person from the dataset. See if the model's decision changes — with everything else identical.
                </p>
                <div style={{
                  fontSize: 12, color: "#f87171", fontWeight: 700, marginBottom: 28,
                  background: "rgba(239,68,68,0.1)", display: "inline-block",
                  padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)"
                }}>
                  ⚡ Same qualifications. Same experience. Only one thing changed.
                </div>
                <CounterfactualToggle
                  sampleRow={sampleRow}
                  sensitiveColumns={result.sensitive_columns || result.stat?.sensitive_columns || ["sex"]}
                  modelData={result.root_cause?.model_data || ""}
                  resultsPerGroup={result.stat?.results_per_group || {}}
                />
              </div>
            )}

            {/* ── METHODOLOGY ── */}
            {active === "methodology" && (
              <div>
                <SectionLabel>METHODOLOGY · HOW THIS WORKS</SectionLabel>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 8, background: "linear-gradient(135deg, #fff, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Metrics & Glossary
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 32, lineHeight: 1.7 }}>
                  How FairScan calculates fairness, what the numbers mean, and how to interpret results.
                </p>

                {/* Method cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                  {[
                    { title: "Method", body: "Adverse Impact Ratio — the EEOC 4/5ths Rule", color: "#a855f7" },
                    { title: "Formula", body: "min(group_approval_rate) / max(group_approval_rate) × 100", color: "#06d6f0", code: true },
                    { title: "Threshold", body: "Score below 80 = legally significant adverse impact under US employment law", color: "#fbbf24" },
                    { title: "Agent Pipeline", body: "Stat Agent → Root Cause → Legal Mapper → Report Writer → PDF", color: "#10b981" },
                  ].map(m => (
                    <div key={m.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 22px" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: m.color, letterSpacing: ".1em", marginBottom: 10 }}>{m.title.toUpperCase()}</div>
                      {m.code
                        ? <code style={{ fontSize: 12, color: "#06d6f0", background: "rgba(6,214,240,0.08)", padding: "4px 8px", borderRadius: 6, display: "block", lineHeight: 1.8 }}>{m.body}</code>
                        : <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{m.body}</div>
                      }
                    </div>
                  ))}
                </div>

                {/* Fairlearn metrics */}
                {Object.keys(result.stat?.results_per_group || {}).length > 0 && (
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "22px 24px", marginBottom: 24 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: ".1em", marginBottom: 16 }}>FAIRLEARN METRICS</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {Object.entries(result.stat?.results_per_group || {}).map(([col, data]: any) => (
                        <div key={col} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 14px", background: "rgba(255,255,255,0.025)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#a855f7", textTransform: "capitalize", width: 100, flexShrink: 0 }}>{col}</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>DP Diff: <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{data.demographic_parity_difference ?? "N/A"}</span></div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>EO Diff: <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{data.equalized_odds_difference ?? "N/A"}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Glossary */}
                <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: ".12em", marginBottom: 16 }}>GLOSSARY</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    ["pp (Percentage Points)", "#06d6f0", "The simple difference between two percentages — e.g., 60% and 40% = 20pp gap."],
                    ["Demographic Parity (DP)", "#a855f7", "Checks if approval rate is equal across all demographic groups."],
                    ["Equalized Odds (EO)", "#10b981", "Checks if true/false positive rates are equal across groups."],
                    ["Proxy Variable", "#fbbf24", "A neutral feature (e.g. zip code) that correlates with a protected trait (e.g. race)."],
                    ["Adverse Impact Ratio", "#ec4899", "The ratio of selection rates between groups. Below 0.8 = legally significant under EEOC."],
                    ["SHAP Value", "#f472b6", "How much each feature contributed to an individual prediction — the root cause engine."],
                  ].map(([term, color, defn]) => (
                    <div key={term as string} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: color as string, marginBottom: 6 }}>{term}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>{defn}</div>
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.15)", marginTop: 40, fontWeight: 500 }}>
                  Powered by Google Gemini 2.0 Flash · Fairlearn · SHAP · Built for Google AI Hackathon 2026
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover:not(:disabled) { filter: brightness(1.15) !important; }
      `}</style>
    </main>
  );
}