import { listAttendanceDevices } from "../../../lib/list-attendance-logs.js";
import { createDevicesHandler } from "../../../lib/devices-handler.js";

export const dynamic = "force-dynamic";
export const GET = createDevicesHandler({ listDevices: listAttendanceDevices });