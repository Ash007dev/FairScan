"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { AgentTracker } from "@/components/AgentTracker";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type AgentStatus = "idle" | "running" | "done";

interface LogEntry {
  text: string;
  type: string;
}

export default function LoadingPage() {
  const params = useParams();
  const auditId = params?.auditId as string;
  const router = useRouter();

  const [progress, setProgress] = useState<Record<string, AgentStatus>>({
    stat: "idle",
    root_cause: "idle",
    legal_mapper: "idle",
    report_writer: "idle"
  });
  const [logs, setLogs] = useState<LogEntry[]>([
    { text: `$ fairscan audit --id ${auditId?.slice(0, 8) || "..."}`, type: "cmd" }
  ]);
  const [modelName, setModelName] = useState("Hiring Screening Model v2");
  const [error, setError] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!auditId) return;

    // Poll immediately, then every 1500ms
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/audit/${auditId}/status`);
        if (res.status === 404) {
          router.push('/');
          return "stop";
        }
        if (!res.ok) return "continue";
        const data = await res.json();

        if (data.model_name) setModelName(data.model_name);

        if (data.progress) {
          setProgress(data.progress);
        }

        // Sync backend logs to terminal
        // BUG FIX: was deduplicating by text content — two identical messages would drop the second.
        // Now we track by index (data.logs.length vs prev.length) so every entry is kept.
        if (data.logs && data.logs.length > 0) {
          setLogs(prev => {
            const alreadyShown = prev.length - 1; // -1 for the initial cmd line
            const newRawEntries = data.logs.slice(alreadyShown);
            if (newRawEntries.length === 0) return prev;
            const newEntries: LogEntry[] = newRawEntries.map((entry: { type: string; text: string }) => {
              const prefix = entry.type === "ok" ? "✓" : entry.type === "info" ? "→" : entry.type === "warn" ? "!" : " ";
              return { text: `${prefix} ${entry.text}`, type: entry.type };
            });
            return [...prev, ...newEntries];
          });
        }

        // Check for completion
        if (data.status === "complete") {
          setTimeout(() => router.push(`/results/${auditId}`), 1200);
          return "stop";
        }

        if (data.status === "error") {
          setError(data.message || "Audit failed.");
          return "stop";
        }
      } catch {
        // Network error — keep trying
      }
      return "continue";
    };

    poll(); // immediate first poll
    const interval = setInterval(async () => {
      const result = await poll();
      if (result === "stop") clearInterval(interval);
    }, 1500);

    return () => clearInterval(interval);
  }, [auditId, router]);

  const doneCount = Object.values(progress).filter(s => s === "done").length;
  const pct = Math.round((doneCount / 4) * 100);
  const isComplete = pct === 100;

  return (
    <main style={{ background: "#f5f4f0", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{ background: "#fff", borderBottom: "1px solid #e8e6e0", padding: "0 24px", height: 64, display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: -0.8 }}>
          Fair<span style={{ color: "#dc2626" }}>Scan</span>
        </span>
        <span style={{ marginLeft: 16, fontSize: 13, color: "#bbb", fontWeight: 500 }}>Auditing: <span style={{ color: "#777" }}>{modelName}</span></span>
      </nav>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px" }}>

        <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: ".08em", marginBottom: 16 }}>
          AGENT PIPELINE · LIVE STATUS
        </div>

        <AgentTracker progress={progress} />

        {/* Progress bar */}
        <div style={{ background: "#e8e6e0", borderRadius: 8, height: 6, marginTop: 24, overflow: "hidden" }}>
          <div style={{ height: 6, borderRadius: 8, background: isComplete ? "#22c55e" : "#3b82f6", width: `${pct}%`, transition: "width 0.8s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, color: "#999", fontWeight: 500 }}>
          <span>{doneCount} of 4 agents complete</span>
          <span style={{ color: isComplete ? "#22c55e" : "#3b82f6", fontWeight: 700 }}>
            {isComplete ? "Complete · redirecting..." : "Processing..."}
          </span>
        </div>

        {/* Terminal log */}
        <div
          ref={terminalRef}
          style={{
            background: "#0f0f0e", borderRadius: 20, padding: "24px 28px", marginTop: 32,
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            maxHeight: 340, overflowY: "auto"
          }}
        >
          <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 2.2 }}>
            {logs.map((line, i) => (
              <div key={i} style={{
                color: line.type === "ok" ? "#4ade80" : line.type === "info" ? "#60a5fa" : line.type === "warn" ? "#fbbf24" : line.type === "cmd" ? "#777" : "#fff"
              }}>
                {line.text}
              </div>
            ))}
            {!isComplete && !error && (
              <span style={{ display: "inline-block", width: 8, height: 16, background: "#4ade80", verticalAlign: "middle", animation: "blink 1s step-start infinite", marginLeft: 4 }} />
            )}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 24, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "16px", fontSize: 14, color: "#dc2626", fontWeight: 500 }}>
            Error: {error}
            <br />
            <a href="/" style={{ color: "#dc2626", fontWeight: 700, textDecoration: "underline", display: "inline-block", marginTop: 8 }}>&larr; Try again</a>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </main>
  );
}