import { GroupStats } from "@/lib/types";

interface Props {
  resultsPerGroup: Record<string, GroupStats>;
}

function getColor(rate: number, maxRate: number): { bg: string; text: string } {
  const ratio = maxRate > 0 ? rate / maxRate : 0;
  if (ratio >= 0.85) return { bg: "#bbf7d0", text: "#15803d" };
  if (ratio >= 0.65) return { bg: "#d1fae5", text: "#065f46" };
  if (ratio >= 0.45) return { bg: "#fed7aa", text: "#9a3412" };
  return { bg: "#fca5a5", text: "#991b1b" };
}

export function BiasHeatmap({ resultsPerGroup }: Props) {
  const columns = Object.keys(resultsPerGroup);

  if (columns.length === 0) {
    return <div style={{ fontSize: 13, color: "#aaa" }}>No group data available.</div>;
  }

  return (
    <div>
      {columns.map(col => {
        const colData = resultsPerGroup[col];
        const groups = Object.entries(colData.groups);
        const rates = groups.map(([, r]) => r);
        const maxRate = Math.max(...rates);
        const minRate = Math.min(...rates);
        const gap = Math.round(maxRate - minRate);

        return (
          <div key={col} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#111", textTransform: "uppercase", letterSpacing: "0.05em" }}>{col}</div>
              {gap > 10 && (
                <span style={{ fontSize: 10, fontWeight: 800, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, padding: "3px 8px" }}>
                  {gap}pp gap detected
                </span>
              )}
            </div>

            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px" }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 11, fontWeight: 700, color: "#666", padding: "0 12px", textAlign: "left", textTransform: "uppercase" }}>Group</th>
                  <th style={{ fontSize: 11, fontWeight: 700, color: "#666", padding: "0 12px", textAlign: "center", width: 100, textTransform: "uppercase" }}>Approved</th>
                  <th style={{ fontSize: 11, fontWeight: 700, color: "#666", padding: "0 12px", textAlign: "center", width: 100, textTransform: "uppercase" }}>Rejected</th>
                  <th style={{ fontSize: 11, fontWeight: 700, color: "#666", padding: "0 12px", textAlign: "center", width: 100, textTransform: "uppercase" }}>Bias</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(([group, rate]) => {
                  const { bg, text } = getColor(rate, maxRate);
                  const rejected = Math.round(100 - rate);
                  const diff = Math.round(rate - maxRate);

                  return (
                    <tr key={group}>
                      <td style={{ fontSize: 14, fontWeight: 600, color: "#111", padding: "10px 12px" }}>{group}</td>
                      <td style={{ padding: "0 4px" }}>
                        <div style={{ background: bg, color: text, borderRadius: 10, padding: "12px 0", textAlign: "center", fontSize: 14, fontWeight: 800 }}>
                          {rate.toFixed(1)}%
                        </div>
                      </td>
                      <td style={{ padding: "0 4px" }}>
                        <div style={{ background: "#f8f7f4", color: "#666", borderRadius: 10, padding: "12px 0", textAlign: "center", fontSize: 14, fontWeight: 700 }}>
                          {rejected}%
                        </div>
                      </td>
                      <td style={{ padding: "0 4px" }}>
                        <div style={{
                          background: diff === 0 ? "#f8f7f4" : "#fef2f2",
                          color: diff === 0 ? "#bbb" : "#dc2626",
                          borderRadius: 10, padding: "12px 0",
                          textAlign: "center", fontSize: 14, fontWeight: 800
                        }}>
                          {diff === 0 ? "baseline" : `${diff}pp`}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {gap > 10 && (
              <div style={{ marginTop: 12, fontSize: 14, color: "#991b1b", fontWeight: 500, padding: "16px 20px", background: "#fef2f2", borderRadius: 12, border: "1px solid #fca5a5", lineHeight: 1.5 }}>
                {colData.most_approved_group} approved at {minRate > 0 ? (maxRate / minRate).toFixed(1) : "∞"}x the rate of {colData.least_approved_group} — a {gap} percentage point gap. This triggers both EU AI Act Article 10 and the EEOC 4/5ths rule.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}