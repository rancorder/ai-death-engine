export default function ContactPage() {
  return (
    <div
      style={{
        fontFamily: "'Georgia','Times New Roman',serif",
        background: "#090b0e",
        minHeight: "100vh",
        color: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: 560, padding: "60px 24px", textAlign: "center" }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            color: "#475569",
            letterSpacing: ".12em",
            marginBottom: 32,
          }}
        >
          NEXT STEP
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: "#f1f5f9",
            marginBottom: 16,
            lineHeight: 1.4,
          }}
        >
          プロジェクト構造レビュー
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#64748b",
            lineHeight: 1.9,
            marginBottom: 40,
          }}
        >
          AI導入プロジェクトの構造リスクを、
          <strong style={{ color: "#94a3b8" }}>30分</strong>
          で専門家がレビューします。
          <br />
          href="https://m.kuku.lu/f.php?cd245b7c82"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "#ef4444",
            color: "white",
            padding: "16px 40px",
            textDecoration: "none",
            fontSize: 16,
            letterSpacing: ".04em",
            marginTop: 8,
          }}
        >
          レビューを予約する →
        </a>
        </p>
        <a
          href="/diagnostic"
          style={{
            display: "inline-block",
            background: "transparent",
            border: "1px solid #334155",
            color: "#94a3b8",
            padding: "14px 32px",
            textDecoration: "none",
            fontSize: 14,
            fontFamily: "inherit",
            letterSpacing: ".06em",
            transition: "all .18s",
          }}
        >
          ← 診断に戻る
        </a>
      </div>
    </div>
  );
}
