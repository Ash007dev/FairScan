import { Violation } from "@/lib/types";

const RISK_STYLES = {
  high: {
    bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)",
    text: "#f87171", pill: "linear-gradient(135deg, #ef4444, #dc2626)",
    glow: "rgba(239,68,68,0.2)"
  },
  medium: {
    bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)",
    text: "#fbbf24", pill: "linear-gradient(135deg, #f59e0b, #d97706)",
    glow: "rgba(245,158,11,0.15)"
  },
  low: {
    bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)",
    text: "#10b981", pill: "linear-gradient(135deg, #10b981, #059669)",
    glow: "rgba(16,185,129,0.15)"
  },
};

export function LegalBadge({ violation }: { violation: Violation }) {
  const s = RISK_STYLES[violation.risk_level as keyof typeof RISK_STYLES] || RISK_STYLES.medium;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: `1px solid ${s.border}`,
      borderRadius: 18, padding: "22px 24px", marginBottom: 14,
      boxShadow: `0 8px 32px ${s.glow}`,
      transition: "transform 0.2s, box-shadow 0.2s"
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{
          fontSize: 10, fontWeight: 900, padding: "5px 12px",
          borderRadius: 8, background: s.pill, color: "#fff", letterSpacing: ".08em",
          boxShadow: `0 4px 12px ${s.glow}`
        }}>
          {violation.risk_level.toUpperCase()} RISK
        </span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.9)", letterSpacing: -0.3 }}>
          {violation.regulation}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: ".1em" }}>
            Deadline
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: s.text,
            background: s.bg, padding: "3px 10px", borderRadius: 7,
            border: `1px solid ${s.border}`
          }}>
            {violation.deadline}
          </span>
        </div>
      </div>

      {/* Finding */}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 14, lineHeight: 1.7 }}>
        {violation.finding}
      </div>

      {/* Required action */}
      <div style={{
        fontSize: 12, fontWeight: 700, color: s.text,
        background: s.bg, border: `1px solid ${s.border}`,
        borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8
      }}>
        <span style={{ opacity: 0.6 }}>→</span>
        {violation.required_action}
      </div>
    </div>
  );
}