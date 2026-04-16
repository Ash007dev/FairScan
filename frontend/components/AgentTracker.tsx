type AgentStatus = "idle" | "running" | "done";

interface Props {
  progress: Record<string, AgentStatus>;
}

const AGENTS = [
  { key: "stat",          label: "Stat agent",          sub: "fairlearn · disparity scores" },
  { key: "root_cause",    label: "Root cause agent",    sub: "SHAP · feature isolation" },
  { key: "legal_mapper",  label: "Legal mapper agent",  sub: "Gemini · EU AI Act + EEOC" },
  { key: "report_writer", label: "Report writer agent", sub: "Gemini · compliance memo" },
];

export function AgentTracker({ progress }: Props) {
  return (
    <div>
      {AGENTS.map(agent => {
        const status: AgentStatus = progress[agent.key] || "idle";
        const s = {
          idle:    { bg: "#fafaf7", border: "#e8e6e0", dot: "#d4d2ca", text: "#ccc" },
          running: { bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", text: "#2563eb" },
          done:    { bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e", text: "#16a34a" },
        }[status];

        return (
          <div key={agent.key} style={{
            display: "flex", alignItems: "center", gap: 12,
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 12, padding: "12px 16px", marginBottom: 8,
            transition: "all 0.4s"
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: s.dot, flexShrink: 0,
              animation: status === "running" ? "pulse 1.1s ease-in-out infinite" : "none"
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{agent.label}</div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{agent.sub}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: s.text }}>
              {status === "done" ? "✓ Done" : status === "running" ? "Running..." : "Waiting"}
            </div>
          </div>
        );
      })}
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.8)}}`}</style>
    </div>
  );
}