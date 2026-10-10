import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createLogAuthFailure, hasLogViewerAccess } from "../lib/log-auth.js";

const username = "log-admin";
const password = "test-only-password";
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
const originalUsername = process.env.LOG_VIEWER_USERNAME;
const originalPassword = process.env.LOG_VIEWER_PASSWORD;

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restoreEnv("LOG_VIEWER_USERNAME", originalUsername);
  restoreEnv("LOG_VIEWER_PASSWORD", originalPassword);
});

test("accepts the configured Basic authentication credentials", () => {
  assert.equal(hasLogViewerAccess(authorization, username, password), true);
});

test("rejects missing, incorrect, or unconfigured credentials", () => {
  assert.equal(hasLogViewerAccess(null, username, password), false);
  assert.equal(hasLogViewerAccess(authorization, username, "wrong-password"), false);
  assert.equal(hasLogViewerAccess(authorization, undefined, password), false);
  assert.equal(hasLogViewerAccess("Bearer token", username, password), false);
});

test("authentication rejects requests without credentials", () => {
  process.env.LOG_VIEWER_USERNAME = username;
  process.env.LOG_VIEWER_PASSWORD = password;

  const response = createLogAuthFailure(
    null,
    process.env.LOG_VIEWER_USERNAME,
    process.env.LOG_VIEWER_PASSWORD,
  );

  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate"), /^Basic/);
});

test("authentication permits valid dashboard credentials", () => {
  assert.equal(createLogAuthFailure(authorization, username, password), null);
});