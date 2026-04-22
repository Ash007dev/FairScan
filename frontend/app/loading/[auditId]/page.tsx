"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AgentTracker } from "@/components/AgentTracker";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type AgentStatus = "idle" | "running" | "done";

export default function LoadingPage() {
  const params = useParams();
  const auditId = params.auditId as string;
  const router = useRouter();

  const [progress, setProgress] = useState<Record<string, AgentStatus>>({
    stat: "idle",
    root_cause: "idle",
    legal_mapper: "idle",
    report_writer: "idle"
  });
  const [logs, setLogs] = useState<Array<{ text: string; type: string }>>([
    { text: `$ fairscan audit --file adult.csv --col income`, type: "cmd" }
  ]);
  const [modelName, setModelName] = useState("Hiring Screening Model v2");
  const [error, setError] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (isSimulating) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/audit/${auditId}/status`);
        const data = await res.json();
        
        if (data.model_name) setModelName(data.model_name);

        if (data.progress) {
          setProgress(data.progress);
          updateLogs(data.progress, data.result);
        }

        if (data.status === "complete") {
          clearInterval(interval);
          setTimeout(() => router.push(`/results/${auditId}`), 1000);
        }
        if (data.status === "error") {
          clearInterval(interval);
          setError(data.message || "Audit failed.");
        }
      } catch {
        // network error
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [auditId, router, isSimulating]);

  function updateLogs(prog: Record<string, AgentStatus>, result: any) {
    setLogs(prev => {
      const existing = prev.map(l => l.text);
      const newLines: Array<{ text: string; type: string }> = [];

      if (prog.stat === "done" && !existing.includes("✓ Fairness score: 34/100 (critical)")) {
        newLines.push({ text: "✓ Loaded 48,842 rows, 15 columns", type: "ok" });
        newLines.push({ text: "✓ Detected sensitive cols: sex, race, native-country", type: "ok" });
        newLines.push({ text: "✓ Fairness score: 34/100 (critical)", type: "ok" });
      }
      if (prog.root_cause === "done" && !existing.includes("✓ Root cause: \"sex\" column (SHAP=0.312)")) {
        newLines.push({ text: "✓ Root cause: \"sex\" column (SHAP=0.312)", type: "ok" });
      }
      if (prog.legal_mapper === "done" && !existing.includes("✓ EU AI Act Article 10 -- HIGH RISK")) {
        newLines.push({ text: "✓ EU AI Act Article 10 -- HIGH RISK", type: "ok" });
        newLines.push({ text: "✓ EEOC 4/5 rule -- MEDIUM RISK", type: "ok" });
      }
      if (prog.report_writer === "done" && !existing.includes("✓ PDF generated fairscan_a3f2b891.pdf")) {
        newLines.push({ text: "✓ Compliance memo written (312 words)", type: "ok" });
        newLines.push({ text: "✓ PDF generated fairscan_a3f2b891.pdf", type: "ok" });
        newLines.push({ text: "→ Redirecting to results...", type: "info" });
      }

      return newLines.length > 0 ? [...prev, ...newLines] : prev;
    });
  }

  function simulateStage(stage: number) {
    setIsSimulating(true);
    if (stage === 0) {
      setProgress({ stat: "idle", root_cause: "idle", legal_mapper: "idle", report_writer: "idle" });
      setLogs([{ text: `$ fairscan audit --file adult.csv --col income`, type: "cmd" }]);
    } else if (stage === 1) {
      setProgress({ stat: "done", root_cause: "running", legal_mapper: "idle", report_writer: "idle" });
      updateLogs({ stat: "done" }, {});
    } else if (stage === 2) {
      setProgress({ stat: "done", root_cause: "done", legal_mapper: "running", report_writer: "idle" });
      updateLogs({ stat: "done", root_cause: "done" }, {});
    } else if (stage === 3) {
      setProgress({ stat: "done", root_cause: "done", legal_mapper: "done", report_writer: "done" });
      updateLogs({ stat: "done", root_cause: "done", legal_mapper: "done", report_writer: "done" }, {});
    }
  }

  const doneCount = Object.values(progress).filter(s => s === "done").length;
  const pct = Math.round((doneCount / 4) * 100);

  return (
    <main style={{ background: "#f5f4f0", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{ background: "#fff", borderBottom: "1px solid #e8e6e0", padding: "0 24px", height: 64, display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>
          Fair<span style={{ color: "#dc2626" }}>Scan</span>
        </span>
        <span style={{ marginLeft: 16, fontSize: 13, color: "#bbb", fontWeight: 500 }}>Auditing: <span style={{ color: "#777" }}>{modelName}</span></span>
      </nav>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px" }}>
        
        {/* Simulation Buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 32 }}>
          <button onClick={() => simulateStage(0)} style={btnStyle}>Reset</button>
          <button onClick={() => simulateStage(1)} style={btnStyle}>Stage 1 done</button>
          <button onClick={() => simulateStage(2)} style={btnStyle}>Stage 2 done</button>
          <button onClick={() => simulateStage(3)} style={btnStyle}>All done</button>
          <button onClick={() => setIsSimulating(false)} style={{...btnStyle, color: "#dc2626"}}>Watch live</button>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".08em", marginBottom: 16 }}>
          AGENT PIPELINE — LIVE STATUS
        </div>

        <AgentTracker progress={progress} />

        {/* Progress bar */}
        <div style={{ background: "#e8e6e0", borderRadius: 8, height: 6, marginTop: 24, overflow: "hidden" }}>
          <div style={{ height: 6, borderRadius: 8, background: "#3b82f6", width: `${pct}%`, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, color: "#999", fontWeight: 500 }}>
          <span>{doneCount} of 4 agents complete</span>
          <button 
            onClick={() => router.push(`/results/${auditId}`)}
            style={{ 
              background: "none", border: "none", color: pct === 100 ? "#3b82f6" : "#aaa", 
              fontWeight: 700, cursor: pct === 100 ? "pointer" : "default" 
            }}
          >
            {pct === 100 ? "Complete" : "Processing..."}
          </button>
        </div>

        {/* Terminal log */}
        <div style={{ background: "#0f0f0e", borderRadius: 20, padding: "24px 28px", marginTop: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
          <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 2.2 }}>
            {logs.map((line, i) => (
              <div key={i} style={{
                color: line.type === "ok" ? "#4ade80" : line.type === "info" ? "#60a5fa" : line.type === "cmd" ? "#777" : "#fff"
              }}>
                {line.text}
              </div>
            ))}
            <span style={{ display: "inline-block", width: 8, height: 16, background: "#4ade80", verticalAlign: "middle", animation: "blink 1s step-start infinite", marginLeft: 4 }} />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 24, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "16px", fontSize: 14, color: "#dc2626", fontWeight: 500 }}>
            Error: {error}
            <br />
            <a href="/" style={{ color: "#dc2626", fontWeight: 700, textDecoration: "underline", display: "inline-block", marginTop: 8 }}>← Try again</a>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </main>
  );
}

const btnStyle = {
  padding: "10px 18px",
  background: "#000",
  border: "none",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  color: "#fff",
  cursor: "pointer",
  transition: "all 0.2s",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
};