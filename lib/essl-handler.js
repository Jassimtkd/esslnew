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
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;

  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function getDeviceIdentifier(request) {
  const params = new URL(request.url).searchParams;
  for (const name of ["SN", "sn", "deviceId", "device_id", "serial"]) {
    const identifier = params.get(name)?.trim();
    if (identifier) return identifier.slice(0, 128);
  }
  return null;
}

export function createEsslHandlers({ storeAttendance }) {
  async function GET(_request, { params }) {
    const { deviceKey } = await params;
    const authorized = isAuthorized(deviceKey);
    if (authorized === null) return textResponse("Receiver is not configured", 500);
    if (!authorized) return textResponse("Unauthorized", 401);
    return textResponse(HANDSHAKE);
  }

  async function POST(request, { params }) {
    const { deviceKey } = await params;
    const authorized = isAuthorized(deviceKey);
    if (authorized === null) return textResponse("Receiver is not configured", 500);
    if (!authorized) return textResponse("Unauthorized", 401);

    let body;
    try {
      body = await readBody(request);
    } catch {
      return textResponse("Unable to read attendance data", 400);
    }
    if (body === null) return textResponse("Attendance data exceeds 64 KB", 413);

    try {
      await storeAttendance(
        body,
        request.headers.get("content-type"),
        getDeviceIdentifier(request),
      );
    } catch {
      return textResponse("Unable to store attendance data", 503);
    }

    return textResponse("OK");
  }

  return { GET, POST };
}