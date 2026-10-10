import { neon } from "@neondatabase/serverless";

export async function storeAttendance(body, contentType) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

  const sql = neon(databaseUrl);
  const bodyBase64 = Buffer.from(body).toString("base64");
  await sql`
    INSERT INTO essl_attendance_logs (body_base64, content_type)
    VALUES (${bodyBase64}, ${contentType})
  `;
}