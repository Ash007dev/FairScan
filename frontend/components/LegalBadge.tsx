import { Violation } from "@/lib/types";

const COLORS = {
  high:   { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", dot: "#dc2626", pill: "#dc2626" },
  medium: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#d97706", pill: "#f59e0b" },
  low:    { bg: "#f0fdf4", border: "#bbf7d0", text: "#14532d", dot: "#22c55e", pill: "#16a34a" },
};

export function LegalBadge({ violation }: { violation: Violation }) {
  const c = COLORS[violation.risk_level] || COLORS.medium;

  return (
    <div style={{
      background: "#fff", border: `1px solid ${c.border}`,
      borderRadius: 16, padding: "20px", marginBottom: 16,
      boxShadow: "0 2px 8px rgba(0,0,0,0.01)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{
          fontSize: 10, fontWeight: 900, padding: "4px 10px",
          borderRadius: 6, background: c.pill, color: "#fff", letterSpacing: ".05em"
        }}>
          {violation.risk_level.toUpperCase()} RISK
        </span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>
          {violation.regulation}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "#bbb" }}>
          Deadline: {violation.deadline}
        </span>
      </div>
      <div style={{ fontSize: 14, color: "#666", marginBottom: 16, lineHeight: 1.6, fontWeight: 450 }}>
        {violation.finding}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: "#991b1b",
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 8, padding: "10px 16px", display: "inline-block"
      }}>
        Required: {violation.required_action}
      </div>
    </div>
  );
}