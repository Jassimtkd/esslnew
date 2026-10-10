import assert from "node:assert/strict";
import { test } from "node:test";
import { ensureAttendanceSchema } from "../lib/ensure-attendance-schema.js";

test("attendance schema is initialized once for concurrent cold-start requests", async () => {
  const statements = [];
  const sql = async (parts) => {
    statements.push(parts.join(" "));
    return [];
  };

  await Promise.all([
    ensureAttendanceSchema(sql),
    ensureAttendanceSchema(sql),
    ensureAttendanceSchema(sql),
  ]);

  assert.equal(statements.length, 3);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS essl_attendance_logs/);
  assert.match(statements[1], /ADD COLUMN IF NOT EXISTS device_identifier/);
  assert.match(statements[2], /CREATE INDEX IF NOT EXISTS essl_attendance_logs_received_idx/);
});