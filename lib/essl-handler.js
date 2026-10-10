import { timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 64 * 1024;
const HANDSHAKE = [
  "GET OPTION FROM: 1",
  "Stamp=9999",
  "OpStamp=9999",
  "ErrorDelay=60",
  "Delay=30",
  "OK",
].join("\n");

function textResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function isAuthorized(deviceKey) {
  const expectedKey = process.env.ESSL_DEVICE_KEY;
  if (!expectedKey) return null;

  const supplied = Buffer.from(deviceKey);
  const expected = Buffer.from(expectedKey);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function readBody(request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { tooLarge: true, byteCount: declaredLength };
  }

  const reader = request.body?.getReader();
  if (!reader) return { body: new Uint8Array(), byteCount: 0 };

  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      return { tooLarge: true, byteCount: length };
    }
    chunks.push(value);
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body, byteCount: length };
}

function getDeviceIdentifier(request) {
  const params = new URL(request.url).searchParams;
  for (const name of ["SN", "sn", "deviceId", "device_id", "serial"]) {
    const identifier = params.get(name)?.trim();
    if (identifier) return identifier.slice(0, 128);
  }
  return null;
}

function declaredBodySize(request) {
  const value = Number(request.headers.get("content-length"));
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function writePostReceipt(logPostReceipt, status, byteCount) {
  try {
    logPostReceipt({
      timestamp: new Date().toISOString(),
      status,
      byteCount,
    });
  } catch {
    // Diagnostic logging must not change the ESSL response.
  }
}

export function createEsslHandlers({
  storeAttendance,
  requireDeviceKey = true,
  logPostReceipt = (receipt) => console.info("ESSL_POST_RECEIPT", JSON.stringify(receipt)),
}) {
  async function authorize(context) {
    if (!requireDeviceKey) return true;
    if (!process.env.ESSL_DEVICE_KEY) return null;
    const { deviceKey } = await context.params;
    return isAuthorized(deviceKey);
  }

  async function GET(_request, context) {
    const authorized = await authorize(context);
    if (authorized === null) return textResponse("Receiver is not configured", 500);
    if (!authorized) return textResponse("Unauthorized", 401);
    return textResponse(HANDSHAKE);
  }

  async function POST(request, context) {
    const authorized = await authorize(context);
    if (authorized === null) return textResponse("Receiver is not configured", 500);
    if (!authorized) return textResponse("Unauthorized", 401);

    let result;
    try {
      result = await readBody(request);
    } catch {
      writePostReceipt(logPostReceipt, 400, declaredBodySize(request));
      return textResponse("Unable to read attendance data", 400);
    }
    if (result.tooLarge) {
      writePostReceipt(logPostReceipt, 413, result.byteCount);
      return textResponse("Attendance data exceeds 64 KB", 413);
    }
    const { body, byteCount } = result;

    try {
      await storeAttendance(
        body,
        request.headers.get("content-type"),
        getDeviceIdentifier(request),
      );
    } catch {
      writePostReceipt(logPostReceipt, 503, byteCount);
      return textResponse("Unable to store attendance data", 503);
    }

    writePostReceipt(logPostReceipt, 200, byteCount);
    return textResponse("OK");
  }

  return { GET, POST };
}