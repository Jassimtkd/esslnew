import { LOGS_PAGE_SIZE } from "./list-attendance-logs.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function createLogsHandler({ listLogs }) {
  return async function GET(request) {
    const params = new URL(request.url).searchParams;
    const requestedPage = Number.parseInt(params.get("page") ?? "1", 10);
    const page = Number.isFinite(requestedPage) ? Math.max(1, Math.min(requestedPage, 100000)) : 1;
    const search = (params.get("q") ?? "").trim().slice(0, 100);

    try {
      const result = await listLogs({ search, page });
      const totalPages = Math.max(1, Math.ceil(result.total / LOGS_PAGE_SIZE));
      return jsonResponse({
        logs: result.logs.map((log) => ({
          id: String(log.id),
          receivedAt: new Date(log.received_at).toISOString(),
          deviceIdentifier: log.device_identifier,
          contentType: log.content_type,
          rawPayload: log.body_text || Buffer.from(log.body_base64 ?? "", "base64").toString("utf8"),
        })),
        page,
        pageSize: LOGS_PAGE_SIZE,
        total: result.total,
        totalPages,
      });
    } catch {
      return jsonResponse({ error: "Unable to load attendance logs" }, 503);
    }
  };
}