"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { AgentTracker } from "@/components/AgentTracker";
import { Cpu, CheckCircle, XCircle, Zap } from "@/components/Icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type AgentStatus = "idle" | "running" | "done";

interface LogEntry {
  text: string;
  type: string;
}

export default function LoadingPage() {
  const params  = useParams();
  const auditId = params?.auditId as string;
  const router  = useRouter();

  const [progress, setProgress] = useState<Record<string, AgentStatus>>({
    stat: "idle", root_cause: "idle", legal_mapper: "idle", report_writer: "idle"
  });
  const [logs, setLogs] = useState<LogEntry[]>([
    { text: `$ fairscan audit --id ${auditId?.slice(0, 8) || "..."}`, type: "cmd" }
  ]);
  const [modelName, setModelName] = useState("Hiring Screening Model v2");
  const [error, setError] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!auditId) return;

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/audit/${auditId}/status`);
        if (res.status === 404) { router.push("/"); return "stop"; }
        if (!res.ok) return "continue";
        const data = await res.json();

        if (data.model_name) setModelName(data.model_name);
        if (data.progress)   setProgress(data.progress);

        if (data.logs && data.logs.length > 0) {
          setLogs(prev => {
            const alreadyShown = prev.length - 1;
            const newRawEntries = data.logs.slice(alreadyShown);
            if (newRawEntries.length === 0) return prev;
            const newEntries: LogEntry[] = newRawEntries.map((entry: { type: string; text: string }) => {
              const prefix = entry.type === "ok" ? "✓" : entry.type === "info" ? "→" : entry.type === "warn" ? "!" : " ";
              return { text: `${prefix} ${entry.text}`, type: entry.type };
            });
            return [...prev, ...newEntries];
          });
        }

        if (data.status === "complete") {
          setTimeout(() => router.push(`/results/${auditId}`), 1000);
          return "stop";
        }
        if (data.status === "error") {
          setError(data.message || "Audit failed.");
          return "stop";
        }
      } catch { /* keep trying */ }
      return "continue";
    };

    poll();
    const interval = setInterval(async () => {
      const result = await poll();
      if (result === "stop") clearInterval(interval);
    }, 1500);
    return () => clearInterval(interval);
  }, [auditId, router]);

  const doneCount = Object.values(progress).filter(s => s === "done").length;
  const pct       = Math.round((doneCount / 4) * 100);
  const isComplete = pct === 100;

  return (
    <main style={{
      minHeight: "100vh",
      background: "#000000",
      fontFamily: "'Space Grotesk', sans-serif",
      position: "relative", overflow: "hidden"
    }}>
      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "-10%", right: "10%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
          animation: "orb-drift 20s ease-in-out infinite"
        }} />
        <div style={{
          position: "absolute", bottom: "10%", left: "5%",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,214,240,0.1) 0%, transparent 70%)",
          animation: "orb-drift 25s ease-in-out infinite reverse"
        }} />
      </div>

      {/* Navbar */}
      <nav style={{
        position: "relative", zIndex: 10,
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 32px", height: 64, display: "flex", alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg, #a855f7, #06d6f0)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}><Cpu size={14} color="#fff" /></div>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>
            Fair<span style={{ color: "#a855f7" }}>Scan</span>
          </span>
        </div>
        <span style={{ marginLeft: 20, fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
          Auditing: <span style={{ color: "rgba(255,255,255,0.6)" }}>{modelName}</span>
        </span>
      </nav>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: ".12em", marginBottom: 8 }}>
            AGENT PIPELINE · LIVE STATUS
          </div>
          <div style={{
            fontSize: 24, fontWeight: 800, letterSpacing: -0.5,
            background: "linear-gradient(135deg, #fff, #a78bfa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>
            {isComplete ? "Analysis complete" : "Agents running..."}
          </div>
        </div>

        {/* Agent cards */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 20, padding: 20, marginBottom: 20,
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
        }}>
          <AgentTracker progress={progress} />
        </div>

        {/* Progress bar */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16, padding: "16px 20px", marginBottom: 20
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>{doneCount} of 4 agents complete</span>
            <span style={{ color: isComplete ? "#10b981" : "#a855f7", fontWeight: 700 }}>
              {isComplete ? "✓ Complete · redirecting..." : `${pct}%`}
            </span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, height: 6, overflow: "hidden" }}>
            <div style={{
              height: 6, borderRadius: 8,
              background: isComplete
                ? "linear-gradient(90deg, #10b981, #06d6f0)"
                : "linear-gradient(90deg, #7c3aed, #a855f7, #06d6f0)",
              width: `${pct}%`,
              transition: "width 0.8s ease",
              boxShadow: isComplete ? "0 0 12px rgba(16,185,129,0.5)" : "0 0 12px rgba(168,85,247,0.5)"
            }} />
          </div>
        </div>

        {/* Terminal */}
        <div
          ref={terminalRef}
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20, padding: "20px 24px",
            maxHeight: 300, overflowY: "auto",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)"
          }}
        >
          {/* Terminal header dots */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["#ff5f57","#febc2e","#28c840"].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            ))}
            <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>
              fairscan terminal
            </span>
          </div>

          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 2 }}>
            {logs.map((line, i) => (
              <div key={i} style={{
                color: line.type === "ok"   ? "#10b981"
                     : line.type === "info" ? "#06d6f0"
                     : line.type === "warn" ? "#fbbf24"
                     : line.type === "cmd"  ? "rgba(255,255,255,0.3)"
                     : "rgba(255,255,255,0.7)"
              }}>
                {line.text}
              </div>
            ))}
            {!isComplete && !error && (
              <span style={{
                display: "inline-block", width: 8, height: 14,
                background: "#10b981", verticalAlign: "middle",
                animation: "blink 1s step-start infinite", marginLeft: 4
              }} />
            )}
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 20,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 14, padding: 20, fontSize: 14, color: "#f87171", fontWeight: 500
          }}>
            Error: {error}
            <br />
            <a href="/" style={{ color: "#f87171", fontWeight: 700, display: "inline-block", marginTop: 8 }}>
              ← Try again
            </a>
          </div>
        )}
      </div>

      <style>{`
        @keyframes orb-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </main>
  );
}