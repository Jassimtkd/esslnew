export function createLogViewModel({ status, logs = [], error, page = 1, totalPages = 1 }) {
  if (status === "loading") return { state: "loading" };
  if (status === "error") return { state: "error", message: error };
  if (logs.length === 0) return { state: "empty" };

  return {
    state: "results",
    logs: logs.map((log) => ({
      id: log.id,
      receivedAt: log.receivedAt,
      deviceIdentifier: log.deviceIdentifier || "Unknown",
      contentType: log.contentType || "Unknown",
      rawPayload: log.rawPayload,
    })),
    page,
    totalPages,
  };
}