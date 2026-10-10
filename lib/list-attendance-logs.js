import { neon } from "@neondatabase/serverless";

export const LOGS_PAGE_SIZE = 25;

export async function listAttendanceLogs({ search, page }) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

  const sql = neon(databaseUrl);
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