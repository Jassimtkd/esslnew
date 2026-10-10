import assert from "node:assert/strict";
import { test } from "node:test";
import { createLogsHandler } from "../lib/logs-handler.js";
import { createLogViewModel } from "../lib/log-view-model.js";

test("logs API returns searchable, paginated rows newest-first data", async () => {
  let query;
  const getLogs = createLogsHandler({
    listLogs: async (value) => {
      query = value;
      return {
        total: 26,
        logs: [{
          id: 52n,
          received_at: new Date("2026-10-10T09:30:00.000Z"),
          device_identifier: "machine-42",
          content_type: "text/plain",
          body_text: "PIN=42",
          body_base64: "UElOPTRa",
        }],
      };
    },
  });

  const response = await getLogs(new Request("https://receiver.test/api/logs?q=PIN%3D42&page=2"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(query, { search: "PIN=42", page: 2 });
  assert.equal(body.pageSize, 25);
  assert.equal(body.totalPages, 2);
  assert.deepEqual(body.logs[0], {
    id: "52",
    receivedAt: "2026-10-10T09:30:00.000Z",
    deviceIdentifier: "machine-42",
    contentType: "text/plain",
    rawPayload: "PIN=42",
  });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("logs API represents an empty database without an error", async () => {
  const getLogs = createLogsHandler({
    listLogs: async () => ({ logs: [], total: 0 }),
  });

  const response = await getLogs(new Request("https://receiver.test/api/logs"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.logs, []);
  assert.equal(body.total, 0);
  assert.equal(body.totalPages, 1);
});

test("logs API returns a generic error when storage is unavailable", async () => {
  const getLogs = createLogsHandler({
    listLogs: async () => {
      throw new Error("private connection details");
    },
  });

  const response = await getLogs(new Request("https://receiver.test/api/logs"));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Unable to load attendance logs" });
});

test("logs API displays records created before searchable text was added", async () => {
  const getLogs = createLogsHandler({
    listLogs: async () => ({
      total: 1,
      logs: [{
        id: 9,
        received_at: new Date("2026-10-10T09:30:00.000Z"),
        device_identifier: null,
        content_type: "text/plain",
        body_text: "",
        body_base64: Buffer.from("PIN=42").toString("base64"),
      }],
    }),
  });

  const response = await getLogs(new Request("https://receiver.test/api/logs"));

  assert.equal((await response.json()).logs[0].rawPayload, "PIN=42");
});

test("dashboard view model exposes loading, empty, and error states", () => {
  assert.deepEqual(createLogViewModel({ status: "loading" }), { state: "loading" });
  assert.deepEqual(createLogViewModel({ status: "ready", logs: [] }), { state: "empty" });
  assert.deepEqual(
    createLogViewModel({ status: "error", error: "Retry required" }),
    { state: "error", message: "Retry required" },
  );
});

test("dashboard view model displays device, timestamp, and raw payload", () => {
  const view = createLogViewModel({
    status: "ready",
    page: 2,
    totalPages: 4,
    logs: [{
      id: "7",
      receivedAt: "2026-10-10T09:30:00.000Z",
      deviceIdentifier: "machine-42",
      contentType: "text/plain",
      rawPayload: "PIN=42",
    }],
  });

  assert.deepEqual(view, {
    state: "results",
    page: 2,
    totalPages: 4,
    logs: [{
      id: "7",
      receivedAt: "2026-10-10T09:30:00.000Z",
      deviceIdentifier: "machine-42",
      contentType: "text/plain",
      rawPayload: "PIN=42",
    }],
  });
});