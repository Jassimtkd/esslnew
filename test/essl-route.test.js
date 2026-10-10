import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { createEsslHandlers } from "../lib/essl-handler.js";

const originalDeviceKey = process.env.ESSL_DEVICE_KEY;
const originalDestinations = process.env.ATTENDANCE_DESTINATIONS_JSON;
const originalFetch = globalThis.fetch;
const deviceKey = "test-device-key";
const destinationUrl = "https://app.credencecraft.in/api/integrations/essl/attendance";
let handlers;
let saveAttendance;

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function context(key = deviceKey) {
  return { params: Promise.resolve({ deviceKey: key }) };
}

beforeEach(() => {
  process.env.ESSL_DEVICE_KEY = deviceKey;
  process.env.ATTENDANCE_DESTINATIONS_JSON = JSON.stringify([
    { url: destinationUrl, token: "test-destination-token" },
  ]);
  saveAttendance = async () => {};
  handlers = createEsslHandlers({ storeAttendance: (...args) => saveAttendance(...args) });
});

afterEach(() => {
  restoreEnv("ESSL_DEVICE_KEY", originalDeviceKey);
  restoreEnv("ATTENDANCE_DESTINATIONS_JSON", originalDestinations);
  globalThis.fetch = originalFetch;
});

test("GET returns the ESSL handshake as plain text", async () => {
  const response = await handlers.GET(new Request("https://receiver.test"), context());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(
    await response.text(),
    "GET OPTION FROM: 1\nStamp=9999\nOpStamp=9999\nErrorDelay=60\nDelay=30\nOK",
  );
});

test("POST forwards the raw body and destination bearer token", async () => {
  const rawBody = Buffer.from("PIN=42\tDateTime=2026-10-10 09:30:00\r\n");
  let received;
  let stored;
  saveAttendance = async (...args) => {
    stored = args;
  };
  globalThis.fetch = async (url, options) => {
    received = { url, options };
    return new Response("accepted", { status: 200 });
  };
  const request = new Request("https://receiver.test", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: rawBody,
  });

  const response = await handlers.POST(request, context());

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "OK");
  assert.equal(received.url, destinationUrl);
  assert.deepEqual(Buffer.from(received.options.body), rawBody);
  assert.deepEqual(Buffer.from(stored[0]), rawBody);
  assert.equal(stored[1], "text/plain");
  assert.equal(received.options.headers.authorization, "Bearer test-destination-token");
  assert.equal(received.options.headers["content-type"], "text/plain");
});

test("POST fans out to every configured destination with its own token", async () => {
  process.env.ATTENDANCE_DESTINATIONS_JSON = JSON.stringify([
    { url: destinationUrl, token: "erp-token" },
    { url: "https://attendance.example.test/ingest", token: "second-token" },
  ]);
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, authorization: options.headers.authorization });
    return new Response("accepted", { status: 200 });
  };
  const request = new Request("https://receiver.test", { method: "POST", body: "attendance" });

  const response = await handlers.POST(request, context());

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    { url: destinationUrl, authorization: "Bearer erp-token" },
    { url: "https://attendance.example.test/ingest", authorization: "Bearer second-token" },
  ]);
});

test("invalid device keys are rejected", async () => {
  globalThis.fetch = async () => {
    assert.fail("must not forward an unauthorized request");
  };
  const response = await handlers.POST(new Request("https://receiver.test", { method: "POST", body: "data" }), context("wrong-key"));

  assert.equal(response.status, 401);
  assert.equal(await response.text(), "Unauthorized");
});

test("POST rejects bodies larger than 64 KB", async () => {
  globalThis.fetch = async () => {
    assert.fail("must not forward an oversized request");
  };
  const request = new Request("https://receiver.test", {
    method: "POST",
    body: "x".repeat(64 * 1024 + 1),
  });

  const response = await handlers.POST(request, context());

  assert.equal(response.status, 413);
  assert.equal(await response.text(), "Attendance data exceeds 64 KB");
});

test("destination failures produce a retryable device error", async () => {
  globalThis.fetch = async () => new Response("failed", { status: 503 });
  const request = new Request("https://receiver.test", { method: "POST", body: "attendance" });

  const response = await handlers.POST(request, context());

  assert.equal(response.status, 502);
  assert.equal(await response.text(), "Unable to forward attendance data");
});

test("Neon storage failures return an error without forwarding", async () => {
  saveAttendance = async () => {
    throw new Error("database unavailable");
  };
  globalThis.fetch = async () => {
    assert.fail("must not forward a request that was not stored");
  };
  const request = new Request("https://receiver.test", { method: "POST", body: "attendance" });

  const response = await handlers.POST(request, context());

  assert.equal(response.status, 503);
  assert.equal(await response.text(), "Unable to store attendance data");
});