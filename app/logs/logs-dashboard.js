"use client";

import { useEffect, useState } from "react";
import { createLogViewModel } from "../../lib/log-view-model.js";
import styles from "./logs-dashboard.module.css";

const errorMessage = "Unable to load logs. Check your access and database setup, then retry.";

export default function LogsDashboard() {
  const [module, setModule] = useState("logs");
  const [status, setStatus] = useState("loading");
  const [logs, setLogs] = useState([]);
  const [devicesStatus, setDevicesStatus] = useState("idle");
  const [devices, setDevices] = useState([]);
  const [devicesError, setDevicesError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [devicesRefreshKey, setDevicesRefreshKey] = useState(0);

  useEffect(() => {
    if (module !== "logs") return undefined;
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
  }, [module, page, refreshKey, search]);

  useEffect(() => {
    if (module !== "devices") return undefined;
    const controller = new AbortController();

    async function loadDevices() {
      setDevicesStatus("loading");
      try {
        const response = await fetch("/api/devices", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Device request failed");
        const result = await response.json();
        setDevices(result.devices);
        setDevicesStatus("ready");
      } catch (error) {
        if (error.name !== "AbortError") {
          setDevicesError("Unable to load devices. Check the Neon connection and retry.");
          setDevicesStatus("error");
        }
      }
    }

    loadDevices();
    return () => controller.abort();
  }, [devicesRefreshKey, module]);

  const view = createLogViewModel({ status, logs, error: errorMessage, page, totalPages });

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function openDeviceLogs(device) {
    const deviceSearch = device.id === "unknown" ? "" : device.id;
    setSearchInput(deviceSearch);
    setSearch(deviceSearch);
    setPage(1);
    setModule("logs");
  }

  return (
    <div className={styles.layout}>
      <aside aria-label="Main sidebar" className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>E</span>
          <span><strong>ESSL</strong><small>Attendance console</small></span>
        </div>
        <p className={styles.navLabel}>WORKSPACE</p>
        <nav aria-label="Dashboard modules" className={styles.navigation}>
          <button
            aria-current={module === "devices" ? "page" : undefined}
            className={module === "devices" ? styles.activeNav : styles.navButton}
            onClick={() => setModule("devices")}
            type="button"
          >
            Devices
          </button>
          <button
            aria-current={module === "logs" ? "page" : undefined}
            className={module === "logs" ? styles.activeNav : styles.navButton}
            onClick={() => setModule("logs")}
            type="button"
          >
            Logs
          </button>
        </nav>
        <div className={styles.sidebarFooter}>Attendance records · Neon</div>
      </aside>

      <main className={styles.content}>
        {module === "devices" ? (
          <section>
            <header className={styles.pageHeader}>
              <div>
                <h1>Devices</h1>
                <p>Machines seen by the attendance receiver</p>
              </div>
              <button onClick={() => setDevicesRefreshKey((value) => value + 1)} type="button">
                Refresh
              </button>
            </header>
            {devicesStatus === "loading" && <p role="status">Loading devices…</p>}
            {devicesStatus === "error" && (
              <div className={styles.message} role="alert">
                <p>{devicesError}</p>
                <button onClick={() => setDevicesRefreshKey((value) => value + 1)} type="button">Retry</button>
              </div>
            )}
            {devicesStatus === "ready" && devices.length === 0 && (
              <p className={styles.empty}>No devices have sent logs yet.</p>
            )}
            {devicesStatus === "ready" && devices.length > 0 && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Device</th><th>Logs received</th><th>Last activity</th><th /></tr>
                  </thead>
                  <tbody>
                    {devices.map((device) => (
                      <tr key={device.id}>
                        <td><strong>{device.name}</strong></td>
                        <td>{device.totalLogs.toLocaleString()}</td>
                        <td>{device.lastReceivedAt ? new Date(device.lastReceivedAt).toLocaleString() : "-"}</td>
                        <td>
                          <button onClick={() => openDeviceLogs(device)} type="button">View logs</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section>
            <header className={styles.pageHeader}>
              <div>
                <h1>Logs</h1>
                <p>Newest attendance records first</p>
              </div>
              <form className={styles.searchForm} onSubmit={submitSearch}>
                <label className={styles.visuallyHidden} htmlFor="log-search">Search logs</label>
                <input
                  id="log-search"
                  maxLength={100}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search device or payload"
                  type="search"
                  value={searchInput}
                />
                <button type="submit">Search</button>
              </form>
            </header>
            {view.state === "loading" && <p role="status">Loading attendance logs…</p>}
            {view.state === "error" && (
              <div className={styles.message} role="alert">
                <p>{view.message}</p>
                <button onClick={() => setRefreshKey((value) => value + 1)} type="button">Retry</button>
              </div>
            )}
            {view.state === "empty" && <p className={styles.empty}>No matching attendance logs.</p>}
            {view.state === "results" && (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Received</th><th>Device</th><th>Content type</th><th>Raw payload</th></tr>
                    </thead>
                    <tbody>
                      {view.logs.map((log) => (
                        <tr key={log.id}>
                          <td className={styles.timestamp}>{new Date(log.receivedAt).toLocaleString()}</td>
                          <td>{log.deviceIdentifier}</td>
                          <td>{log.contentType}</td>
                          <td><pre className={styles.payload}>{log.rawPayload}</pre></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <nav aria-label="Log pages" className={styles.pagination}>
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
          </section>
        )}
      </main>
    </div>
  );
}