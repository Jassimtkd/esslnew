import { storeAttendance } from "../../../lib/store-attendance.js";
import { createEsslHandlers } from "../../../lib/essl-handler.js";

export const runtime = "nodejs";

const handlers = createEsslHandlers({ storeAttendance, requireDeviceKey: false });

export const GET = handlers.GET;
export const POST = handlers.POST;