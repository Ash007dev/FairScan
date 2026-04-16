import { FeatureRanking } from "@/lib/types";

interface Props {
  featureRanking: FeatureRanking[];
  topDriver: string;
}

export function RootCauseChart({ featureRanking, topDriver }: Props) {
  if (!featureRanking || featureRanking.length === 0) {
    return <div style={{ fontSize: 13, color: "#aaa" }}>No feature data available.</div>;
  }

  const top8 = featureRanking.slice(0, 8);
  const maxVal = top8[0]?.shap_importance || 1;

  return (
    <div>
      {top8.map((f, i) => {
        const isTop = f.column === topDriver;
        const pct = Math.round((f.shap_importance / maxVal) * 100);
        const barColor = isTop ? "#dc2626" : i < 3 ? "#3b82f6" : "#94a3b8";

        return (
          <div key={f.column} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              fontSize: 12, fontWeight: isTop ? 700 : 500,
              color: isTop ? "#dc2626" : "#555",
              width: 120, flexShrink: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
            }}>
              {f.column}
            </div>
            <div style={{ flex: 1, height: 7, background: "#f0ede8", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: 7, width: `${pct}%`,
                background: barColor, borderRadius: 4,
                transition: "width 0.8s ease"
              }} />
            </div>
            <div style={{ fontSize: 11, color: isTop ? "#dc2626" : "#aaa", width: 42, textAlign: "right", fontWeight: isTop ? 700 : 400, flexShrink: 0 }}>
              {f.shap_importance.toFixed(3)}
            </div>
          </div>
        );
      })}
    </div>
  );
}