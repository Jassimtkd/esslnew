import { neon } from "@neondatabase/serverless";

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  return neon(process.env.DATABASE_URL);
}

export async function storeLoginOtp(email, otpDigest) {
  const sql = getSql();
  const inserted = await sql`
    WITH recent AS (
      SELECT COUNT(*)::int AS count
      FROM essl_dashboard_otps
      WHERE email = ${email} AND created_at > now() - interval '15 minutes'
    ), saved AS (
      INSERT INTO essl_dashboard_otps (email, code_digest, expires_at)
      SELECT ${email}, ${otpDigest}, now() + interval '10 minutes'
      WHERE (SELECT count FROM recent) < 3
      RETURNING id
    )
    SELECT id FROM saved
  `;
  return inserted.length > 0;
}

export async function consumeLoginOtp(email, otpDigest) {
  const sql = getSql();
  const consumed = await sql`
    UPDATE essl_dashboard_otps
    SET used_at = now()
    WHERE id = (
      SELECT id
      FROM essl_dashboard_otps
      WHERE email = ${email}
        AND code_digest = ${otpDigest}
        AND used_at IS NULL
        AND expires_at > now()
        AND attempts < 5
      ORDER BY created_at DESC
      LIMIT 1
    )
    RETURNING email
  `;

  if (consumed.length > 0) return true;

  await sql`
    UPDATE essl_dashboard_otps
    SET attempts = attempts + 1
    WHERE id = (
      SELECT id
      FROM essl_dashboard_otps
      WHERE email = ${email} AND used_at IS NULL AND expires_at > now() AND attempts < 5
      ORDER BY created_at DESC
      LIMIT 1
    )
  `;
  return false;
}

export async function revokeLoginOtp(email, otpDigest) {
  const sql = getSql();
  await sql`
    UPDATE essl_dashboard_otps
    SET used_at = now()
    WHERE email = ${email} AND code_digest = ${otpDigest} AND used_at IS NULL
  `;
}