import assert from "node:assert/strict";
import { test } from "node:test";
import { hasLogViewerAccess } from "../lib/log-auth.js";

const username = "log-admin";
const password = "test-only-password";
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

test("accepts the configured Basic authentication credentials", () => {
  assert.equal(hasLogViewerAccess(authorization, username, password), true);
});

test("rejects missing, incorrect, or unconfigured credentials", () => {
  assert.equal(hasLogViewerAccess(null, username, password), false);
  assert.equal(hasLogViewerAccess(authorization, username, "wrong-password"), false);
  assert.equal(hasLogViewerAccess(authorization, undefined, password), false);
  assert.equal(hasLogViewerAccess("Bearer token", username, password), false);
});