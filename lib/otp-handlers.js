import { randomInt } from "node:crypto";
import {
  createDashboardSession,
  createOtpDigest,
  DASHBOARD_EMAIL,
  DASHBOARD_SESSION_COOKIE,
  DASHBOARD_SESSION_SECONDS,
  normalizeDashboardEmail,
} from "./log-auth.js";

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function createOtpHandlers({ storeOtp, consumeOtp, revokeOtp, sendOtp }) {
  async function requestOtp(request) {
    const input = await readJson(request);
    const email = normalizeDashboardEmail(input?.email);
    if (email !== DASHBOARD_EMAIL) {
      return jsonResponse({ error: `Request a code for ${DASHBOARD_EMAIL}.` }, 400);
    }

    const secret = process.env.AUTH_SECRET;
    if (
      !secret || secret.length < 32 || !process.env.DATABASE_URL ||
      !process.env.RESEND_API_KEY || !process.env.OTP_FROM_EMAIL
    ) {
      return jsonResponse({ error: "Email login is not configured." }, 503);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const digest = createOtpDigest(email, code, secret);

    try {
      const stored = await storeOtp(email, digest);
      if (!stored) return jsonResponse({ error: "Too many codes requested. Try again later." }, 429);
      await sendOtp(email, code);
      return jsonResponse({ sent: true });
    } catch {
      try {
        await revokeOtp(email, digest);
      } catch {
        // Do not expose provider or database details to the client.
      }
      return jsonResponse({ error: "Could not send the sign-in code. Try again later." }, 503);
    }
  }

  async function verifyOtp(request) {
    const input = await readJson(request);
    const email = normalizeDashboardEmail(input?.email);
    const code = typeof input?.code === "string" ? input.code.trim() : "";
    const secret = process.env.AUTH_SECRET;

    if (email !== DASHBOARD_EMAIL || !/^\d{6}$/.test(code)) {
      return jsonResponse({ error: "Invalid or expired code." }, 401);
    }
    if (!secret || secret.length < 32 || !process.env.DATABASE_URL) {
      return jsonResponse({ error: "Email login is not configured." }, 503);
    }

    try {
      const consumed = await consumeOtp(email, createOtpDigest(email, code, secret));
      if (!consumed) return jsonResponse({ error: "Invalid or expired code." }, 401);

      const session = createDashboardSession(email, secret);
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      return jsonResponse(
        { authenticated: true },
        200,
        {
          "set-cookie": `${DASHBOARD_SESSION_COOKIE}=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DASHBOARD_SESSION_SECONDS}${secure}`,
        },
      );
    } catch {
      return jsonResponse({ error: "Could not verify the code. Try again." }, 503);
    }
  }

  function logout() {
    return jsonResponse(
      { authenticated: false },
      200,
      { "set-cookie": `${DASHBOARD_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` },
    );
  }

  return { requestOtp, verifyOtp, logout };
}