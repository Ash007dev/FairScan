"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const AGENTS = [
  { key: "stat",          label: "Stat agent",          sub: "fairlearn · computing disparity scores per group" },
  { key: "root_cause",    label: "Root cause agent",    sub: "SHAP · finding which column drives bias" },
  { key: "legal_mapper",  label: "Legal mapper agent",  sub: "Gemini · mapping to EU AI Act + EEOC + RBI" },
  { key: "report_writer", label: "Report writer agent", sub: "Gemini · writing plain-English compliance memo" },
];

type AgentStatus = "idle" | "running" | "done";

export default function LoadingPage() {
  const params = useParams();
  const auditId = params.auditId as string;
  const router = useRouter();

  const [progress, setProgress] = useState<Record<string, AgentStatus>>({});
  const [logs, setLogs] = useState<Array<{ text: string; type: string }>>([
    { text: "Starting audit pipeline...", type: "normal" }
  ]);
  const [error, setError] = useState("");

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/audit/${auditId}/status`);
        const data = await res.json();

        if (data.progress) {
          setProgress(data.progress);

          // Add log lines as agents complete
          setLogs(prev => {
            const existing = prev.map(l => l.text);
            const newLines: Array<{ text: string; type: string }> = [];

            if (data.progress.stat === "done" && !existing.includes("✓ Fairness statistics computed")) {
              newLines.push({ text: "✓ Sensitive columns detected", type: "ok" });
              newLines.push({ text: "✓ Fairness statistics computed", type: "ok" });
            }
            if (data.progress.root_cause === "done" && !existing.includes("✓ Root cause column identified")) {
              newLines.push({ text: "✓ Root cause column identified via SHAP", type: "ok" });
            }
            if (data.progress.legal_mapper === "running" && !existing.includes("→ Mapping to EU AI Act...")) {
              newLines.push({ text: "→ Mapping to EU AI Act...", type: "info" });
            }
            if (data.progress.legal_mapper === "done" && !existing.includes("✓ Legal violations identified")) {
              newLines.push({ text: "✓ Legal violations identified", type: "ok" });
            }
            if (data.progress.report_writer === "done" && !existing.includes("✓ Compliance memo written")) {
              newLines.push({ text: "✓ Compliance memo written", type: "ok" });
            }

            return newLines.length > 0 ? [...prev, ...newLines].slice(-10) : prev;
          });
        }

        if (data.status === "complete") {
          clearInterval(interval);
          setTimeout(() => router.push(`/results/${auditId}`), 600);
        }
        if (data.status === "error") {
          clearInterval(interval);
          setError(data.message || "Audit failed. Please try again.");
        }
      } catch {
        // network error — keep polling
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [auditId, router]);

  const doneCount = Object.values(progress).filter(s => s === "done").length;
  const pct = Math.round((doneCount / 4) * 100);

  return (
    <main style={{ background: "#f5f4f0", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{ background: "#fff", borderBottom: "1px solid #e8e6e0", padding: "0 24px", height: 50, display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>
          Fair<span style={{ color: "#dc2626" }}>Scan</span>
        </span>
        <span style={{ marginLeft: 12, fontSize: 12, color: "#aaa" }}>Running audit...</span>
      </nav>

      <div style={{ maxWidth: 540, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", letterSpacing: ".08em", marginBottom: 14 }}>
          AGENT PIPELINE — LIVE
        </div>

        {AGENTS.map(agent => {
          const status: AgentStatus = progress[agent.key] || "idle";
          const styles = {
            idle:    { bg: "#fafaf7", border: "#e8e6e0", dot: "#d4d2ca", text: "#ccc" },
            running: { bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", text: "#2563eb" },
            done:    { bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e", text: "#16a34a" },
          }[status];

          return (
            <div key={agent.key} style={{
              display: "flex", alignItems: "center", gap: 13,
              background: styles.bg, border: `1px solid ${styles.border}`,
              borderRadius: 12, padding: "14px 16px", marginBottom: 8,
              transition: "all 0.4s ease", opacity: status === "idle" ? 0.55 : 1
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: styles.dot, flexShrink: 0,
                animation: status === "running" ? "pulse 1.1s ease-in-out infinite" : "none"
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{agent.label}</div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{agent.sub}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: styles.text, whiteSpace: "nowrap" }}>
                {status === "done" ? "✓ Done" : status === "running" ? "Running..." : "Waiting"}
              </div>
            </div>
          );
        })}

        {/* Progress bar */}
        <div style={{ background: "#e8e6e0", borderRadius: 6, height: 4, marginTop: 18, overflow: "hidden" }}>
          <div style={{ height: 4, borderRadius: 6, background: "#3b82f6", width: `${pct}%`, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "#aaa" }}>
          <span>{doneCount} of 4 agents complete</span>
          <span style={{ color: "#3b82f6", fontWeight: 500 }}>
            {pct < 100 ? `~${Math.max(0, (4 - doneCount) * 6)}s remaining` : "Redirecting..."}
          </span>
        </div>

        {/* Terminal log */}
        <div style={{ background: "#0f0f0e", borderRadius: 12, padding: "14px 18px", marginTop: 20, fontFamily: "monospace", fontSize: 12, lineHeight: 1.9 }}>
          {logs.map((line, i) => (
            <div key={i} style={{
              color: line.type === "ok" ? "#4ade80" : line.type === "info" ? "#60a5fa" : "#9ca3af"
            }}>
              {line.text}
            </div>
          ))}
          <span style={{ display: "inline-block", width: 7, height: 14, background: "#4ade80", verticalAlign: "middle", animation: "blink 1s step-start infinite" }} />
        </div>

        {error && (
          <div style={{ marginTop: 16, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#dc2626" }}>
            Error: {error}
            <br />
            <a href="/" style={{ color: "#dc2626", fontWeight: 600 }}>← Try again</a>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.8)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </main>
  );
}