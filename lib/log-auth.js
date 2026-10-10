import { createHmac, timingSafeEqual } from "node:crypto";

export const DASHBOARD_EMAIL = "jassimtkd@gmail.com";
export const DASHBOARD_SESSION_COOKIE = "essl_dashboard_session";
export const DASHBOARD_SESSION_SECONDS = 8 * 60 * 60;

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function normalizeDashboardEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function createOtpDigest(email, code, secret) {
  return sign(`${normalizeDashboardEmail(email)}:${code}`, secret);
}

export function createDashboardSession(email, secret, now = Date.now()) {
  if (normalizeDashboardEmail(email) !== DASHBOARD_EMAIL || !secret || secret.length < 32) {
    throw new Error("Dashboard session is not configured");
  }

  const payload = Buffer.from(JSON.stringify({
    email: DASHBOARD_EMAIL,
    expiresAt: Math.floor(now / 1000) + DASHBOARD_SESSION_SECONDS,
  })).toString("base64url");

  return `${payload}.${sign(payload, secret)}`;
}

export function hasDashboardSession(token, secret, now = Date.now()) {
  if (!token || !secret || secret.length < 32 || token.length > 2048) return false;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined || !safeEqual(signature, sign(payload, secret))) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return (
      session.email === DASHBOARD_EMAIL &&
      Number.isInteger(session.expiresAt) &&
      session.expiresAt > Math.floor(now / 1000)
    );
  } catch {
    return false;
  }
}