import { GroupStats } from "@/lib/types";

interface Props {
  resultsPerGroup: Record<string, GroupStats>;
}

function getColor(rate: number, maxRate: number): { bg: string; text: string; glow: string } {
  const ratio = maxRate > 0 ? rate / maxRate : 0;
  if (ratio >= 0.85) return { bg: "rgba(16,185,129,0.15)", text: "#10b981", glow: "rgba(16,185,129,0.3)" };
  if (ratio >= 0.65) return { bg: "rgba(6,214,240,0.12)", text: "#06d6f0", glow: "rgba(6,214,240,0.25)" };
  if (ratio >= 0.45) return { bg: "rgba(245,158,11,0.12)", text: "#fbbf24", glow: "rgba(245,158,11,0.25)" };
  return { bg: "rgba(239,68,68,0.12)", text: "#f87171", glow: "rgba(239,68,68,0.25)" };
}

export function BiasHeatmap({ resultsPerGroup }: Props) {
  const columns = Object.keys(resultsPerGroup);

  if (columns.length === 0) {
    return <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No group data available.</div>;
  }

  return (
    <div>
      {columns.map(col => {
        const colData = resultsPerGroup[col];
        const groups  = Object.entries(colData.groups);
        const rates   = groups.map(([, r]) => r);
        const maxRate = Math.max(...rates);
        const minRate = Math.min(...rates);
        const gap     = Math.round(maxRate - minRate);

        return (
          <div key={col} style={{ marginBottom: 28 }}>
            {/* Column header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase", letterSpacing: ".08em"
              }}>
                {col}
              </div>
              {gap > 10 && (
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  background: "rgba(239,68,68,0.15)",
                  color: "#f87171",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 6, padding: "3px 8px"
                }}>
                  ⚠ {gap}pp gap detected
                </span>
              )}
            </div>

            {/* Group rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups.map(([group, rate]) => {
                const { bg, text, glow } = getColor(rate, maxRate);
                const barWidth = maxRate > 0 ? (rate / maxRate) * 100 : 0;
                const diff = Math.round(rate - maxRate);

                return (
                  <div key={group} style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12, padding: "12px 16px",
                    display: "flex", alignItems: "center", gap: 14
                  }}>
                    {/* Group label */}
                    <div style={{ width: 80, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", flexShrink: 0 }}>
                      {group}
                    </div>

                    {/* Bar */}
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                      <div style={{
                        height: 8, borderRadius: 6,
                        background: `linear-gradient(90deg, ${text}60, ${text})`,
                        width: `${barWidth}%`,
                        transition: "width 0.8s ease",
                        boxShadow: `0 0 8px ${glow}`
                      }} />
                    </div>

                    {/* Approval rate */}
                    <div style={{
                      width: 64, textAlign: "center",
                      background: bg, borderRadius: 8,
                      padding: "6px 0", fontSize: 13, fontWeight: 800, color: text,
                      flexShrink: 0, boxShadow: `0 0 12px ${glow}`
                    }}>
                      {rate.toFixed(1)}%
                    </div>

                    {/* Bias delta */}
                    <div style={{
                      width: 64, textAlign: "center",
                      background: diff === 0 ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.1)",
                      borderRadius: 8, padding: "6px 0",
                      fontSize: 12, fontWeight: 700,
                      color: diff === 0 ? "rgba(255,255,255,0.2)" : "#f87171",
                      flexShrink: 0
                    }}>
                      {diff === 0 ? "base" : `${diff}pp`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bias alert */}
            {gap > 10 && (
              <div style={{
                marginTop: 12, fontSize: 13, color: "#f87171", fontWeight: 500,
                padding: "14px 18px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 12, lineHeight: 1.6
              }}>
                <strong style={{ color: "#fca5a5" }}>{colData.most_approved_group}</strong> approved at{" "}
                {minRate > 0 ? (maxRate / minRate).toFixed(1) : "∞"}× the rate of{" "}
                <strong style={{ color: "#fca5a5" }}>{colData.least_approved_group}</strong> — a{" "}
                {gap}pp gap. Triggers EU AI Act Article 10 + EEOC 4/5ths rule.
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8,
        paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)"
      }}>
        {[
          ["#10b981", "≥85% of max · Low risk"],
          ["#06d6f0", "65–84% · Moderate"],
          ["#fbbf24", "45–64% · High risk"],
          ["#f87171", "<45% · Critical"],
        ].map(([color, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}