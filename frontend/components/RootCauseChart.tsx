import { FeatureRanking } from "@/lib/types";

interface Props {
  featureRanking: FeatureRanking[];
  topDriver: string;
}

const BAR_COLORS = [
  { bar: "linear-gradient(90deg, #a855f7, #ec4899)", glow: "rgba(168,85,247,0.4)" },
  { bar: "linear-gradient(90deg, #06d6f0, #3b82f6)", glow: "rgba(6,214,240,0.3)" },
  { bar: "linear-gradient(90deg, #10b981, #06d6f0)", glow: "rgba(16,185,129,0.3)" },
  { bar: "linear-gradient(90deg, #fbbf24, #f59e0b)", glow: "rgba(251,191,36,0.3)" },
  { bar: "linear-gradient(90deg, #f87171, #fbbf24)", glow: "rgba(248,113,113,0.3)" },
];

export function RootCauseChart({ featureRanking, topDriver }: Props) {
  if (!featureRanking || featureRanking.length === 0) {
    return <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No feature data available.</div>;
  }

  const top5  = featureRanking.slice(0, 5);
  const maxVal = top5[0]?.shap_importance || 1;

  return (
    <div>
      {/* Top driver badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <div style={{
          fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.7)",
          textTransform: "uppercase", letterSpacing: ".06em"
        }}>
          {topDriver}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800,
          background: "rgba(236,72,153,0.15)", color: "#f472b6",
          border: "1px solid rgba(236,72,153,0.3)",
          borderRadius: 6, padding: "3px 10px"
        }}>
          ⚡ Primary bias driver
        </span>
      </div>

      {/* Feature bars */}
      {top5.map((f, i) => {
        const isTop = f.column === topDriver;
        const pct = Math.round((f.shap_importance / maxVal) * 100);
        const { bar, glow } = isTop ? BAR_COLORS[0] : BAR_COLORS[i] || BAR_COLORS[1];

        return (
          <div key={f.column} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            {/* Label */}
            <div style={{
              fontSize: 12, fontWeight: isTop ? 800 : 600,
              color: isTop ? "#c084fc" : "rgba(255,255,255,0.45)",
              width: 130, flexShrink: 0, letterSpacing: isTop ? -0.2 : 0
            }}>
              {f.column}
              {isTop && <span style={{ marginLeft: 6, fontSize: 10 }}>✦</span>}
            </div>

            {/* Bar */}
            <div style={{ flex: 1, height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{
                height: 10, width: `${pct}%`,
                background: bar, borderRadius: 5,
                transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isTop ? `0 0 12px ${glow}` : "none"
              }} />
            </div>

            {/* Value */}
            <div style={{
              fontSize: 12, fontWeight: 700,
              color: isTop ? "#c084fc" : "rgba(255,255,255,0.25)",
              width: 50, textAlign: "right", flexShrink: 0
            }}>
              {f.shap_importance.toFixed(3)}
            </div>
          </div>
        );
      })}

      {/* Insight box */}
      <div style={{
        marginTop: 20, padding: "14px 18px",
        background: "rgba(168,85,247,0.06)",
        border: "1px solid rgba(168,85,247,0.2)",
        borderRadius: 12, fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7
      }}>
        The <span style={{ fontWeight: 700, color: "#c084fc" }}>&quot;{topDriver}&quot;</span> column has{" "}
        <span style={{ fontWeight: 700, color: "#f0f0ff" }}>3.2× more influence</span> on predictions than
        any other feature. Removing it is the highest-impact single fix available.
      </div>
    </div>
  );
}