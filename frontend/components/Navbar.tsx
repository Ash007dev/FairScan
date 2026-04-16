interface Props {
  subtitle?: string;
  showDownload?: boolean;
  downloadUrl?: string;
}

export function Navbar({ subtitle, showDownload, downloadUrl }: Props) {
  return (
    <nav style={{
      background: "#fff",
      borderBottom: "1px solid #e8e6e0",
      padding: "0 24px",
      height: 50,
      display: "flex",
      alignItems: "center",
      position: "sticky",
      top: 0,
      zIndex: 10
    }}>
      <a href="/" style={{ textDecoration: "none" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#111", letterSpacing: -0.5 }}>
          Fair<span style={{ color: "#dc2626" }}>Scan</span>
        </span>
      </a>
      {subtitle && (
        <span style={{ marginLeft: 12, fontSize: 11, color: "#bbb", flex: 1 }}>
          {subtitle}
        </span>
      )}
      {showDownload && downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "7px 14px",
            background: "#111",
            borderRadius: 8,
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            marginLeft: "auto"
          }}
        >
          Download PDF
        </a>
      )}
    </nav>
  );
}