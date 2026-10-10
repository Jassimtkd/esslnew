import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { createEsslHandlers } from "../lib/essl-handler.js";

const originalDeviceKey = process.env.ESSL_DEVICE_KEY;
const originalFetch = globalThis.fetch;
const deviceKey = "test-device-key";
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
  saveAttendance = async () => {};
  handlers = createEsslHandlers({ storeAttendance: (...args) => saveAttendance(...args) });
  globalThis.fetch = async () => assert.fail("attendance data must not be forwarded externally");
});

afterEach(() => {
  restoreEnv("ESSL_DEVICE_KEY", originalDeviceKey);
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

test("simple receiver URL works without a device key", async () => {
  const simpleHandlers = createEsslHandlers({
    storeAttendance: (...args) => saveAttendance(...args),
    requireDeviceKey: false,
  });
  let stored;
  saveAttendance = async (...args) => {
    stored = args;
  };
  delete process.env.ESSL_DEVICE_KEY;

  const handshake = await simpleHandlers.GET(new Request("https://receiver.test/api/essl"));
  const response = await simpleHandlers.POST(
    new Request("https://receiver.test/api/essl?SN=machine-42", { method: "POST", body: "attendance" }),
  );

  assert.equal(handshake.status, 200);
  assert.match(await handshake.text(), /GET OPTION FROM: 1/);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "OK");
  assert.equal(stored[2], "machine-42");
});

test("POST saves raw payload, content type, and device serial without forwarding", async () => {
  const rawBody = Buffer.from("PIN=42\tDateTime=2026-10-10 09:30:00\r\n");
  let stored;
  saveAttendance = async (...args) => {
    stored = args;
  };
  const request = new Request("https://receiver.test?SN=machine-42", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: rawBody,
  });

  const response = await handlers.POST(request, context());

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "OK");
  assert.deepEqual(Buffer.from(stored[0]), rawBody);
  assert.equal(stored[1], "text/plain");
  assert.equal(stored[2], "machine-42");
});

test("POST accepts devices without a serial identifier", async () => {
  let stored;
  saveAttendance = async (...args) => {
    stored = args;
  };
  const request = new Request("https://receiver.test", { method: "POST", body: "attendance" });

  const response = await handlers.POST(request, context());

  assert.equal(response.status, 200);
  assert.equal(stored[2], null);
});

test("invalid device keys are rejected", async () => {
  const request = new Request("https://receiver.test", { method: "POST", body: "data" });
  const response = await handlers.POST(request, context("wrong-key"));

  assert.equal(response.status, 401);
  assert.equal(await response.text(), "Unauthorized");
});

test("POST rejects bodies larger than 64 KB", async () => {
  const request = new Request("https://receiver.test", {
    method: "POST",
    body: "x".repeat(64 * 1024 + 1),
  });

  const response = await handlers.POST(request, context());

  assert.equal(response.status, 413);
  assert.equal(await response.text(), "Attendance data exceeds 64 KB");
});

test("database failures return an error so the device can retry", async () => {
  saveAttendance = async () => {
    throw new Error("database unavailable");
  };
  const request = new Request("https://receiver.test", { method: "POST", body: "attendance" });

  const response = await handlers.POST(request, context());

  assert.equal(response.status, 503);
  assert.equal(await response.text(), "Unable to store attendance data");
});