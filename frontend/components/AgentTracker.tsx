"use client";

type AgentStatus = "idle" | "running" | "done";

interface Props {
  progress: Record<string, AgentStatus>;
}

const AGENTS = [
  { 
    key: "stat", 
    label: "Stat agent", 
    sub: "fairlearn · approval rates · disparity scores · fairness 0-100",
    icon: "📈",
    time: "4.2s"
  },
  { 
    key: "root_cause", 
    label: "Root cause agent", 
    sub: "SHAP values · isolates which column drives bias",
    icon: "🔬",
    time: "8.7s"
  },
  { 
    key: "legal_mapper", 
    label: "Legal mapper agent", 
    sub: "Gemini · EU AI Act · EEOC · RBI guidelines",
    icon: "⚖️",
    time: "14.1s"
  },
  { 
    key: "report_writer", 
    label: "Report writer agent", 
    sub: "Gemini · plain-English memo · PDF generation",
    icon: "📝",
    time: "18.3s"
  },
];

export function AgentTracker({ progress }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {AGENTS.map(agent => {
        const status: AgentStatus = progress[agent.key] || "idle";
        const isDone = status === "done";
        const isRunning = status === "running";
        
        const s = {
          idle:    { bg: "#fafaf7", border: "#e8e6e0", dot: "#d4d2ca", text: "#ccc" },
          running: { bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", text: "#2563eb" },
          done:    { bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e", text: "#16a34a" },
        }[status];

        return (
          <div key={agent.key} style={{
            display: "flex", alignItems: "center", gap: 16,
            background: isDone ? "#f0fdf4" : isRunning ? "#eff6ff" : "#fff", 
            border: isDone ? "2px solid #bbf7d0" : isRunning ? "2px solid #bfdbfe" : "1px solid #e8e6e0",
            borderRadius: 16, padding: "18px 20px",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: status === "idle" ? 0.4 : 1,
            transform: isRunning ? "scale(1.01)" : "scale(1)"
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: "50%",
              background: s.dot, flexShrink: 0,
              animation: isRunning ? "pulse 1.2s infinite" : "none"
            }} />
            
            <div style={{ 
              width: 44, height: 44, borderRadius: 12, 
              background: isDone ? "#dcfce7" : isRunning ? "#dbeafe" : "#fafaf9",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
            }}>
              {agent.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{agent.label}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2, fontWeight: 500 }}>{agent.sub}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.text, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                {isDone ? "✓ Done" : isRunning ? "Running..." : "Waiting"}
              </div>
              {isDone && <div style={{ fontSize: 11, color: "#999", marginTop: 2, fontWeight: 500 }}>in {agent.time}</div>}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
      `}</style>
    </div>
  );
}