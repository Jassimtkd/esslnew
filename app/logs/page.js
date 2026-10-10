import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const LOG_LIMIT = 50;

export default async function LogsPage() {
  let logs = [];
  let unavailable = false;

  try {
    const sql = neon(process.env.DATABASE_URL);
    logs = await sql`
      SELECT id, received_at, content_type, body_base64
      FROM essl_attendance_logs
      ORDER BY received_at DESC, id DESC
      LIMIT ${LOG_LIMIT}
    `;
  } catch {
    unavailable = true;
  }

  return (
    <main style={{ margin: "0 auto", maxWidth: 1100, padding: 24 }}>
      <header style={{ alignItems: "baseline", display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Attendance logs</h1>
          <p style={{ color: "#555", marginTop: 0 }}>Latest {LOG_LIMIT} device requests</p>
        </div>
        <a href="/logs">Refresh</a>
      </header>

      {unavailable ? (
        <p role="alert">Logs are unavailable. Check the Neon connection and database schema.</p>
      ) : logs.length === 0 ? (
        <p>No attendance logs received yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: 720, width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #888", textAlign: "left" }}>
                <th style={{ padding: 10 }}>Received</th>
                <th style={{ padding: 10 }}>Content type</th>
                <th style={{ padding: 10 }}>Device payload</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={String(log.id)} style={{ borderBottom: "1px solid #ccc", verticalAlign: "top" }}>
                  <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                    {new Date(log.received_at).toLocaleString()}
                  </td>
                  <td style={{ padding: 10 }}>{log.content_type || "-"}</td>
                  <td style={{ maxWidth: 640, padding: 10 }}>
                    <pre style={{ margin: 0, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                      {Buffer.from(log.body_base64, "base64").toString("utf8")}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}