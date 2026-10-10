import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createOtpHandlers } from "../lib/otp-handlers.js";
import { createOtpDigest, DASHBOARD_EMAIL, hasDashboardSession } from "../lib/log-auth.js";

const secret = "test-auth-secret-that-is-at-least-thirty-two-characters";
const environment = ["AUTH_SECRET", "DATABASE_URL", "RESEND_API_KEY", "OTP_FROM_EMAIL"];
const originalEnvironment = Object.fromEntries(environment.map((key) => [key, process.env[key]]));

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function request(body) {
  return new Request("https://receiver.test/api/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setup(overrides = {}) {
  Object.assign(process.env, {
    AUTH_SECRET: secret,
    DATABASE_URL: "postgres://test.invalid/db",
    RESEND_API_KEY: "test-resend-key",
    OTP_FROM_EMAIL: "Dashboard <logs@example.test>",
  });

  const state = { stored: null, sent: null, consumed: null, revoked: null };
  const handlers = createOtpHandlers({
    storeOtp: async (email, digest) => {
      state.stored = { email, digest };
      return overrides.storeResult ?? true;
    },
    consumeOtp: async (email, digest) => {
      state.consumed = { email, digest };
      return overrides.consumeResult ?? true;
    },
    revokeOtp: async (email, digest) => {
      state.revoked = { email, digest };
    },
    sendOtp: async (email, code) => {
      state.sent = { email, code };
      if (overrides.sendFailure) throw new Error("provider error");
    },
  });
  return { handlers, state };
}

afterEach(() => {
  for (const key of environment) restoreEnv(key, originalEnvironment[key]);
});

test("requests an OTP only for the authorized email and stores only its digest", async () => {
  const { handlers, state } = setup();
  const response = await handlers.requestOtp(request({ email: ` ${DASHBOARD_EMAIL} ` }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { sent: true });
  assert.equal(state.sent.email, DASHBOARD_EMAIL);
  assert.match(state.sent.code, /^\d{6}$/);
  assert.equal(state.stored.email, DASHBOARD_EMAIL);
  assert.equal(state.stored.digest, createOtpDigest(DASHBOARD_EMAIL, state.sent.code, secret));
  assert.notEqual(state.stored.digest, state.sent.code);
});

test("rejects OTP requests for any other email", async () => {
  const { handlers, state } = setup();
  const response = await handlers.requestOtp(request({ email: "other@example.com" }));

  assert.equal(response.status, 400);
  assert.equal(state.sent, null);
});

test("rate limits OTP requests", async () => {
  const { handlers, state } = setup({ storeResult: false });
  const response = await handlers.requestOtp(request({ email: DASHBOARD_EMAIL }));

  assert.equal(response.status, 429);
  assert.equal(state.sent, null);
});

test("revokes a code if the email provider fails", async () => {
  const { handlers, state } = setup({ sendFailure: true });
  const response = await handlers.requestOtp(request({ email: DASHBOARD_EMAIL }));

  assert.equal(response.status, 503);
  assert.deepEqual(state.revoked, state.stored);
});

test("valid OTP creates an HttpOnly session cookie", async () => {
  const { handlers, state } = setup();
  const emailResponse = await handlers.requestOtp(request({ email: DASHBOARD_EMAIL }));
  assert.equal(emailResponse.status, 200);

  const response = await handlers.verifyOtp(request({ email: DASHBOARD_EMAIL, code: state.sent.code }));
  const cookie = response.headers.get("set-cookie");
  const token = /essl_dashboard_session=([^;]+)/.exec(cookie)?.[1];

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: true });
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(state.consumed.digest, state.stored.digest);
  assert.equal(hasDashboardSession(token, secret), true);
});

test("invalid and reused OTPs cannot create sessions", async () => {
  const { handlers } = setup({ consumeResult: false });
  const response = await handlers.verifyOtp(request({ email: DASHBOARD_EMAIL, code: "000000" }));

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("logout expires the session cookie", async () => {
  const { handlers } = setup();
  const response = handlers.logout();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
});