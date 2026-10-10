import { neon } from "@neondatabase/serverless";
import { ensureAttendanceSchema } from "./ensure-attendance-schema.js";

export const LOGS_PAGE_SIZE = 25;

export async function listAttendanceLogs({ search, page }) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

  const sql = neon(databaseUrl);
  await ensureAttendanceSchema(sql);
  const offset = (page - 1) * LOGS_PAGE_SIZE;
  const matchingRows = await sql`
    SELECT COUNT(*)::int AS total
    FROM essl_attendance_logs
    WHERE ${search} = '' OR POSITION(
      LOWER(${search}) IN LOWER(
        COALESCE(device_identifier, '') || ' ' || COALESCE(content_type, '') || ' ' || body_text
      )
    ) > 0
  `;
  const logs = await sql`
    SELECT id, received_at, device_identifier, content_type, body_text, body_base64
    FROM essl_attendance_logs
    WHERE ${search} = '' OR POSITION(
      LOWER(${search}) IN LOWER(
        COALESCE(device_identifier, '') || ' ' || COALESCE(content_type, '') || ' ' || body_text
      )
    ) > 0
    ORDER BY received_at DESC, id DESC
    LIMIT ${LOGS_PAGE_SIZE} OFFSET ${offset}
  `;

  return { logs, total: Number(matchingRows[0]?.total ?? 0) };
}

export async function listAttendanceDevices() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

  const sql = neon(databaseUrl);
  await ensureAttendanceSchema(sql);
  return sql`
    SELECT device_identifier, COUNT(*)::int AS total_logs, MAX(received_at) AS last_received_at
    FROM essl_attendance_logs
    GROUP BY device_identifier
    ORDER BY MAX(received_at) DESC NULLS LAST, device_identifier ASC
    LIMIT 100
  `;
}