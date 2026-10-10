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

function getDestinations() {
  try {
    const destinations = JSON.parse(process.env.ATTENDANCE_DESTINATIONS_JSON ?? "");
    if (!Array.isArray(destinations) || destinations.length === 0) return null;

    for (const destination of destinations) {
      if (
        typeof destination?.url !== "string" ||
        typeof destination?.token !== "string" ||
        destination.token.length === 0
      ) {
        return null;
      }
      const url = new URL(destination.url);
      if (url.protocol !== "https:") return null;
    }

    return destinations;
  } catch {
    return null;
  }
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

    const destinations = getDestinations();
    if (!destinations) return textResponse("Receiver is not configured", 500);

    const contentType = request.headers.get("content-type");
    try {
      await storeAttendance(body, contentType);
    } catch {
      return textResponse("Unable to store attendance data", 503);
    }

    const results = await Promise.allSettled(
      destinations.map(async (destination) => {
        const headers = { authorization: `Bearer ${destination.token}` };
        if (contentType) headers["content-type"] = contentType;

        return await fetch(destination.url, {
          method: "POST",
          headers,
          body,
        });
      }),
    );

    if (results.some((result) => result.status === "rejected" || !result.value.ok)) {
      return textResponse("Unable to forward attendance data", 502);
    }
    return textResponse("OK");
  }

  return { GET, POST };
}