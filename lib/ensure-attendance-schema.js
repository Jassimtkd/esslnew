let schemaInitialization;

export function ensureAttendanceSchema(sql) {
  if (!schemaInitialization) {
    schemaInitialization = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS essl_attendance_logs (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          device_identifier TEXT,
          content_type TEXT,
          body_base64 TEXT NOT NULL,
          body_text TEXT NOT NULL DEFAULT ''
        )
      `;
      await sql`
        ALTER TABLE essl_attendance_logs
          ADD COLUMN IF NOT EXISTS device_identifier TEXT,
          ADD COLUMN IF NOT EXISTS body_text TEXT NOT NULL DEFAULT ''
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS essl_attendance_logs_received_idx
          ON essl_attendance_logs (received_at DESC, id DESC)
      `;
    })().catch((error) => {
      schemaInitialization = undefined;
      throw error;
    });
  }

  return schemaInitialization;
}