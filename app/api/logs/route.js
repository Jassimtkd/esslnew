import { listAttendanceLogs } from "../../../lib/list-attendance-logs.js";
import { createLogsHandler } from "../../../lib/logs-handler.js";

export const dynamic = "force-dynamic";
export const GET = createLogsHandler({ listLogs: listAttendanceLogs });