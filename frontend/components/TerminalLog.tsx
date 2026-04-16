interface LogLine {
  text: string;
  type: "ok" | "info" | "warn" | "normal";
}

interface Props {
  lines: LogLine[];
  showCursor?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  ok:     "#4ade80",
  info:   "#60a5fa",
  warn:   "#fbbf24",
  normal: "#9ca3af",
};

export function TerminalLog({ lines, showCursor = true }: Props) {
  return (
    <div style={{
      background: "#0f0f0e",
      borderRadius: 12,
      padding: "14px 18px",
      fontFamily: "monospace",
      fontSize: 12,
      lineHeight: 1.9
    }}>
      {lines.map((line, i) => (
        <div key={i} style={{ color: TYPE_COLORS[line.type] || "#9ca3af" }}>
          {line.text}
        </div>
      ))}
      {showCursor && (
        <span style={{
          display: "inline-block",
          width: 7, height: 14,
          background: "#4ade80",
          verticalAlign: "middle",
          animation: "blink 1s step-start infinite"
        }} />
      )}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}