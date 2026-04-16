interface Props {
  score: number;
}

export function FairnessGauge({ score }: Props) {
  const rounded = Math.round(score);

  const color =
    rounded < 50 ? "#dc2626" :
    rounded < 75 ? "#d97706" :
    "#16a34a";

  const label =
    rounded < 50 ? "Critical" :
    rounded < 75 ? "Needs work" :
    "Acceptable";

  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: -1, lineHeight: 1 }}>
        {rounded}
        <span style={{ fontSize: 14, color: "#ddd", fontWeight: 400 }}>/100</span>
      </div>
      <div style={{ marginTop: 6, height: 4, background: "#f0ede8", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: 4, width: `${rounded}%`, background: color, borderRadius: 4, transition: "width 1s ease" }} />
      </div>
      <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 4 }}>{label}</div>
    </div>
  );
}