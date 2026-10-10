import { neon } from "@neondatabase/serverless";
import { ensureAttendanceSchema } from "./ensure-attendance-schema.js";

export async function storeAttendance(body, contentType, deviceIdentifier) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

  const sql = neon(databaseUrl);
  await ensureAttendanceSchema(sql);
  const payload = Buffer.from(body);
  const bodyBase64 = payload.toString("base64");
  const bodyText = payload.toString("utf8").replace(/\u0000/g, "\uFFFD");
  await sql`
    INSERT INTO essl_attendance_logs (device_identifier, content_type, body_base64, body_text)
    VALUES (${deviceIdentifier}, ${contentType}, ${bodyBase64}, ${bodyText})
  `;
}