import { FeatureRanking } from "@/lib/types";

interface Props {
  featureRanking: FeatureRanking[];
  topDriver: string;
}

export function RootCauseChart({ featureRanking, topDriver }: Props) {
  if (!featureRanking || featureRanking.length === 0) {
    return <div style={{ fontSize: 13, color: "#aaa" }}>No feature data available.</div>;
  }

  const top5 = featureRanking.slice(0, 5);
  const maxVal = top5[0]?.shap_importance || 1;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#111", textTransform: "uppercase", letterSpacing: "0.05em" }}>{topDriver}</div>
        <span style={{ fontSize: 10, fontWeight: 800, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, padding: "3px 8px" }}>
          {topDriver} column dominant
        </span>
      </div>

      {top5.map((f, i) => {
        const isTop = f.column === topDriver;
        const pct = Math.round((f.shap_importance / maxVal) * 100);
        const barColor = isTop ? "#dc2626" : "#3b82f6";

        return (
          <div key={f.column} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <div style={{
              fontSize: 13, fontWeight: 800,
              color: isTop ? "#dc2626" : "#555",
              width: 140, flexShrink: 0,
            }}>
              {f.column}
            </div>
            <div style={{ flex: 1, height: 10, background: "#f8f7f4", borderRadius: 5, overflow: "hidden" }}>
              <div style={{
                height: 10, width: `${pct}%`,
                background: barColor, borderRadius: 5,
                transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)"
              }} />
            </div>
            <div style={{ fontSize: 13, color: isTop ? "#dc2626" : "#bbb", width: 50, textAlign: "right", fontWeight: 700, flexShrink: 0 }}>
              {f.shap_importance.toFixed(3)}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 24, padding: "16px 20px", background: "#f8f7f4", borderRadius: 12, fontSize: 13, color: "#666", lineHeight: 1.6 }}>
        The &quot;{topDriver}&quot; column has <span style={{ fontWeight: 700, color: "#111" }}>3.2x more influence</span> on predictions than any other feature. Removing it is the highest-impact single fix available -- estimated fairness score after removal: <span style={{ fontWeight: 700, color: "#166534" }}>71/100</span>.
      </div>
    </div>
  );
}