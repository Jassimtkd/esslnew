import assert from "node:assert/strict";
import { test } from "node:test";
import { createDevicesHandler } from "../lib/devices-handler.js";

test("devices API lists device identifiers, log counts, and latest activity", async () => {
  const getDevices = createDevicesHandler({
    listDevices: async () => [
      {
        device_identifier: "machine-42",
        total_logs: 18,
        last_received_at: new Date("2026-10-10T09:30:00.000Z"),
      },
    ],
  });

  const response = await getDevices();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    devices: [{
      id: "machine-42",
      name: "machine-42",
      totalLogs: 18,
      lastReceivedAt: "2026-10-10T09:30:00.000Z",
    }],
  });
});

test("devices API handles no logs and devices without identifiers", async () => {
  const getDevices = createDevicesHandler({
    listDevices: async () => [{ device_identifier: null, total_logs: 1, last_received_at: null }],
  });
  const response = await getDevices();

  assert.deepEqual(await response.json(), {
    devices: [{ id: "unknown", name: "Unknown device", totalLogs: 1, lastReceivedAt: null }],
  });
});

test("devices API returns an error state when Neon is unavailable", async () => {
  const getDevices = createDevicesHandler({ listDevices: async () => { throw new Error("database down"); } });
  const response = await getDevices();

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Unable to load devices" });
});