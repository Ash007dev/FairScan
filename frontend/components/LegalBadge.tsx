import { Violation } from "@/lib/types";

const COLORS = {
  high:   { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", dot: "#dc2626", pill: "#dc2626" },
  medium: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#d97706", pill: "#d97706" },
  low:    { bg: "#f0fdf4", border: "#bbf7d0", text: "#14532d", dot: "#22c55e", pill: "#16a34a" },
};

export function LegalBadge({ violation }: { violation: Violation }) {
  const c = COLORS[violation.risk_level] || COLORS.medium;

  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: "12px 14px", marginBottom: 10
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
        <span style={{
          fontSize: 10, fontWeight: 800, padding: "2px 8px",
          borderRadius: 5, background: c.pill, color: "#fff", letterSpacing: ".03em"
        }}>
          {violation.risk_level.toUpperCase()} RISK
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
          {violation.regulation}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: "#aaa", whiteSpace: "nowrap" }}>
          {violation.deadline}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#444", marginBottom: 8, lineHeight: 1.55 }}>
        {violation.finding}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: c.text,
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 6, padding: "5px 10px", display: "inline-block"
      }}>
        Action: {violation.required_action}
      </div>
    </div>
  );
}