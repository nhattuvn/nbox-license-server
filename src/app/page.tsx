export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <div style={{
        maxWidth: 480,
        width: "100%",
        background: "#1a1a1f",
        border: "1px solid #2a2a32",
        borderRadius: 16,
        padding: "2.5rem",
        textAlign: "center",
      }}>
        {/* Logo / Icon */}
        <div style={{
          width: 56, height: 56,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.5rem",
          fontSize: 28,
        }}>
          🔑
        </div>

        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#f1f1f3" }}>
          NBOX License Server
        </h1>
        <p style={{ margin: "0 0 2rem", color: "#888", fontSize: "0.9rem" }}>
          License verification API for NBOX Flow Render Automation
        </p>

        {/* Status badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#0d2218", border: "1px solid #1a4a30",
          borderRadius: 8, padding: "6px 14px",
          color: "#34d399", fontSize: "0.85rem", fontWeight: 500,
          marginBottom: "2rem",
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#34d399",
            boxShadow: "0 0 6px #34d399",
            display: "inline-block",
          }} />
          Server is running
        </div>

        {/* Endpoint info */}
        <div style={{
          background: "#111115", border: "1px solid #22222a",
          borderRadius: 10, padding: "1rem",
          textAlign: "left", marginBottom: "1.5rem",
        }}>
          <p style={{ margin: "0 0 0.5rem", color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Verify Endpoint
          </p>
          <code style={{
            color: "#a78bfa", fontSize: "0.85rem",
            wordBreak: "break-all", display: "block",
          }}>
            POST /api/license/verify
          </code>
        </div>

        {/* Request body */}
        <div style={{
          background: "#111115", border: "1px solid #22222a",
          borderRadius: 10, padding: "1rem",
          textAlign: "left",
        }}>
          <p style={{ margin: "0 0 0.5rem", color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Request Body
          </p>
          <pre style={{
            margin: 0, color: "#cbd5e1", fontSize: "0.78rem",
            lineHeight: 1.6, overflowX: "auto",
          }}>{`{
  "key": "NBOX-XXXX-YYYY-ZZZZ",
  "machineId": "uuid-v4",
  "extensionVersion": "1.0.0",
  "channel": "production"
}`}</pre>
        </div>

        <p style={{ marginTop: "1.5rem", color: "#555", fontSize: "0.78rem" }}>
          Powered by Next.js · Deployed on Vercel
        </p>
      </div>
    </main>
  );
}
