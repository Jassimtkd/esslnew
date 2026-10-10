"use client";

import { useEffect, useState } from "react";
import { createLogViewModel } from "../../lib/log-view-model.js";

const errorMessage = "Unable to load logs. Check your access and database setup, then retry.";

export default function LogsDashboard() {
  const [status, setStatus] = useState("loading");
  const [logs, setLogs] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLogs() {
      setStatus("loading");
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("q", search);

      try {
        const response = await fetch(`/api/logs?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Log request failed");

        const data = await response.json();
        setLogs(data.logs);
        setTotalPages(data.totalPages);
        setStatus("ready");
      } catch (error) {
        if (error.name !== "AbortError") setStatus("error");
      }
    }

    loadLogs();
    return () => controller.abort();
  }, [page, refreshKey, search]);

  const view = createLogViewModel({ status, logs, error: errorMessage, page, totalPages });

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <main style={{ margin: "0 auto", maxWidth: 1200, padding: 24 }}>
      <header style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Attendance logs</h1>
          <p style={{ color: "#555", marginTop: 0 }}>Newest device requests first</p>
        </div>
        <form onSubmit={submitSearch} style={{ display: "flex", gap: 8 }}>
          <label htmlFor="log-search" style={{ alignSelf: "center" }}>Search logs</label>
          <input
            id="log-search"
            maxLength={100}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Device ID or payload"
            type="search"
            value={searchInput}
          />
          <button type="submit">Search</button>
        </form>
      </header>

      {view.state === "loading" && <p role="status">Loading attendance logs…</p>}
      {view.state === "error" && (
        <div role="alert">
          <p>{view.message}</p>
          <button onClick={() => setRefreshKey((value) => value + 1)} type="button">Retry</button>
        </div>
      )}
      {view.state === "empty" && <p>No matching attendance logs.</p>}
      {view.state === "results" && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", minWidth: 800, width: "100%" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #888", textAlign: "left" }}>
                  <th style={{ padding: 10 }}>Received</th>
                  <th style={{ padding: 10 }}>Device</th>
                  <th style={{ padding: 10 }}>Content type</th>
                  <th style={{ padding: 10 }}>Raw payload</th>
                </tr>
              </thead>
              <tbody>
                {view.logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #ccc", verticalAlign: "top" }}>
                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                      {new Date(log.receivedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: 10 }}>{log.deviceIdentifier}</td>
                    <td style={{ padding: 10 }}>{log.contentType}</td>
                    <td style={{ maxWidth: 640, padding: 10 }}>
                      <pre style={{ margin: 0, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                        {log.rawPayload}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="Log pages" style={{ alignItems: "center", display: "flex", gap: 12, marginTop: 16 }}>
            <button disabled={view.page <= 1} onClick={() => setPage((value) => value - 1)} type="button">
              Previous
            </button>
            <span>Page {view.page} of {view.totalPages}</span>
            <button disabled={view.page >= view.totalPages} onClick={() => setPage((value) => value + 1)} type="button">
              Next
            </button>
          </nav>
        </>
      )}
    </main>
  );
}