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
          <div key={col} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>
              {col}
              {gap > 10 && (
                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 5, padding: "2px 7px" }}>
                  {gap}pp gap
                </span>
              )}
            </div>

            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 3 }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, fontWeight: 700, color: "#aaa", padding: "4px 8px", textAlign: "left" }}>Group</th>
                  <th style={{ fontSize: 10, fontWeight: 700, color: "#aaa", padding: "4px 8px", textAlign: "center" }}>Approved %</th>
                  <th style={{ fontSize: 10, fontWeight: 700, color: "#aaa", padding: "4px 8px", textAlign: "center" }}>Rejected %</th>
                  <th style={{ fontSize: 10, fontWeight: 700, color: "#aaa", padding: "4px 8px", textAlign: "center" }}>vs best</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(([group, rate]) => {
                  const { bg, text } = getColor(rate, maxRate);
                  const rejected = Math.round(100 - rate);
                  const diff = Math.round(rate - maxRate);

                  return (
                    <tr key={group}>
                      <td style={{ fontSize: 12, fontWeight: 500, color: "#444", padding: "6px 8px" }}>{group}</td>
                      <td style={{ padding: 3 }}>
                        <div style={{ background: bg, color: text, borderRadius: 7, padding: "8px 6px", textAlign: "center", fontSize: 13, fontWeight: 700 }}>
                          {rate.toFixed(1)}%
                        </div>
                      </td>
                      <td style={{ padding: 3 }}>
                        <div style={{ background: "#f5f4f0", color: "#888", borderRadius: 7, padding: "8px 6px", textAlign: "center", fontSize: 13, fontWeight: 600 }}>
                          {rejected}%
                        </div>
                      </td>
                      <td style={{ padding: 3 }}>
                        <div style={{
                          background: diff === 0 ? "#f5f4f0" : "#fef2f2",
                          color: diff === 0 ? "#aaa" : "#dc2626",
                          borderRadius: 7, padding: "8px 6px",
                          textAlign: "center", fontSize: 13, fontWeight: 700
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
              <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626", fontWeight: 500, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fca5a5" }}>
                {colData.most_approved_group} approved at {Math.round(maxRate / (minRate || 1) * 10) / 10}× the rate of {colData.least_approved_group}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}