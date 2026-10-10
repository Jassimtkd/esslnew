import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDashboardSession,
  DASHBOARD_EMAIL,
  hasDashboardSession,
} from "../lib/log-auth.js";
import { config, proxy } from "../proxy.js";

const secret = "test-auth-secret-that-is-at-least-thirty-two-characters";
const now = 1_800_000_000_000;
const originalSecret = process.env.AUTH_SECRET;

function restoreSecret() {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
}

test("dashboard session is signed, email-restricted, and expires", () => {
  const token = createDashboardSession(DASHBOARD_EMAIL, secret, now);

  assert.equal(hasDashboardSession(token, secret, now), true);
  assert.equal(hasDashboardSession(token, `${secret}x`, now), false);
  assert.equal(hasDashboardSession(token, secret, now + 8 * 60 * 60 * 1000), false);
  assert.throws(() => createDashboardSession("someone@example.com", secret, now));
  assert.throws(() => createDashboardSession(DASHBOARD_EMAIL, "short", now));
});

test("proxy protects dashboard and log API, redirecting pages to login", () => {
  process.env.AUTH_SECRET = secret;
  const unauthenticated = {
    url: "https://receiver.test/logs",
    nextUrl: { pathname: "/logs" },
    headers: new Headers(),
    cookies: { get: () => undefined },
  };
  const pageResponse = proxy(unauthenticated);
  const apiResponse = proxy({
    ...unauthenticated,
    nextUrl: { pathname: "/api/logs" },
  });

  assert.equal(pageResponse.status, 302);
  assert.equal(pageResponse.headers.get("location"), "https://receiver.test/login");
  assert.equal(apiResponse.status, 401);
  assert.deepEqual(config.matcher, ["/logs/:path*", "/api/logs/:path*"]);

  restoreSecret();
});

test("proxy redirects dashboard to public login when auth is not configured", () => {
  delete process.env.AUTH_SECRET;
  const request = {
    url: "https://receiver.test/logs",
    nextUrl: { pathname: "/logs" },
    headers: new Headers(),
    cookies: { get: () => undefined },
  };

  const response = proxy(request);

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://receiver.test/login");
  restoreSecret();
});

test("proxy permits a valid session and prevents caching", () => {
  process.env.AUTH_SECRET = secret;
  const token = createDashboardSession(DASHBOARD_EMAIL, secret);
  const request = {
    url: "https://receiver.test/logs",
    nextUrl: { pathname: "/logs" },
    headers: new Headers(),
    cookies: { get: () => ({ value: token }) },
  };

  const response = proxy(request);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  restoreSecret();
});