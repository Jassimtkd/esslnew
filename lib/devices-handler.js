function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function createDevicesHandler({ listDevices }) {
  return async function GET() {
    try {
      const devices = await listDevices();
      return jsonResponse({
        devices: devices.map((device) => ({
          id: device.device_identifier || "unknown",
          name: device.device_identifier || "Unknown device",
          totalLogs: Number(device.total_logs),
          lastReceivedAt: device.last_received_at
            ? new Date(device.last_received_at).toISOString()
            : null,
        })),
      });
    } catch {
      return jsonResponse({ error: "Unable to load devices" }, 503);
    }
  };
}