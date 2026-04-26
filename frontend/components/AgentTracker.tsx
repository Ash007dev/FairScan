"use client";
import { TrendingUp, Microscope, Scale, PenLine } from "@/components/Icons";

type AgentStatus = "idle" | "running" | "done" | "error";

interface Props {
  progress: Record<string, AgentStatus>;
}

const AGENTS = [
  {
    key: "stat",
    label: "Statistical Analysis",
    sub: "Fairlearn · Approval rates · Disparity scores · Fairness 0–100",
    icon: <TrendingUp size={18} />,
    color: "#06d6f0",
    time: "4.2s"
  },
  {
    key: "root_cause",
    label: "Root Cause Analysis",
    sub: "SHAP values · Isolates which column drives bias",
    icon: <Microscope size={18} />,
    color: "#a855f7",
    time: "8.7s"
  },
  {
    key: "legal_mapper",
    label: "Legal Mapper",
    sub: "Gemini AI · EU AI Act · EEOC · RBI guidelines",
    icon: <Scale size={18} />,
    color: "#ec4899",
    time: "14.1s"
  },
  {
    key: "report_writer",
    label: "Report Writer",
    sub: "Gemini AI · Plain-English memo · PDF generation",
    icon: <PenLine size={18} />,
    color: "#f59e0b",
    time: "18.3s"
  },
];

export function AgentTracker({ progress }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {AGENTS.map((agent, idx) => {
        const status: AgentStatus = progress[agent.key] || "idle";
        const isDone    = status === "done";
        const isRunning = status === "running";
        const isError   = status === "error";

        return (
          <div key={agent.key} style={{
            display: "flex", alignItems: "center", gap: 16,
            background: isRunning
              ? `rgba(${agent.color === "#06d6f0" ? "6,214,240" : agent.color === "#a855f7" ? "168,85,247" : agent.color === "#ec4899" ? "236,72,153" : "245,158,11"},0.08)`
              : isDone
              ? "rgba(16,185,129,0.06)"
              : isError
              ? "rgba(239,68,68,0.06)"
              : "rgba(255,255,255,0.02)",
            border: isRunning
              ? `1px solid ${agent.color}40`
              : isDone
              ? "1px solid rgba(16,185,129,0.3)"
              : isError
              ? "1px solid rgba(239,68,68,0.3)"
              : "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, padding: "16px 20px",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: status === "idle" ? 0.35 : 1,
            transform: isRunning ? "scale(1.015)" : "scale(1)",
            boxShadow: isRunning ? `0 0 24px ${agent.color}20` : "none",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)"
          }}>
            {/* Status dot */}
            <div style={{
              width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
              background: isRunning ? agent.color : isDone ? "#10b981" : isError ? "#ef4444" : "rgba(255,255,255,0.15)",
              animation: isRunning ? "pulse-dot 1.2s infinite" : "none",
              boxShadow: isRunning ? `0 0 8px ${agent.color}` : "none"
            }} />

            {/* Icon badge */}
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: isRunning
                ? `${agent.color}20`
                : isDone ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${isRunning ? agent.color + "40" : isDone ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ color: isRunning ? agent.color : isDone ? "#10b981" : "rgba(255,255,255,0.25)" }}>
                {agent.icon}
              </span>
            </div>

            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: isDone ? "#10b981" : isRunning ? agent.color : "rgba(255,255,255,0.8)" }}>
                {agent.label}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3, fontWeight: 500 }}>
                {agent.sub}
              </div>
            </div>

            {/* Status badge */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: isError ? "#f87171" : isDone ? "#10b981" : isRunning ? agent.color : "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end"
              }}>
                {isError ? "✗ Error" : isDone ? "✓ Done" : isRunning ? "⚡ Running" : "· Waiting"}
              </div>
              {isDone && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2, fontWeight: 500 }}>
                  in {agent.time}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity:1; transform:scale(1); }
          50% { opacity:0.4; transform:scale(0.7); }
        }
      `}</style>
    </div>
  );
}