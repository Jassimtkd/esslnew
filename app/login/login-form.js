"use client";

import { useState } from "react";

const DASHBOARD_EMAIL = "jassimtkd@gmail.com";

export default function LoginForm() {
  const [stage, setStage] = useState("email");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: DASHBOARD_EMAIL }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send sign-in code.");
      setStage("code");
      setMessage(`A sign-in code was sent to ${DASHBOARD_EMAIL}.`);
    } catch (error) {
      setMessage(error.message || "Could not send sign-in code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: DASHBOARD_EMAIL, code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not verify code.");
      window.location.assign("/logs");
    } catch (error) {
      setMessage(error.message || "Could not verify code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ margin: "12vh auto 0", maxWidth: 420, padding: 24 }}>
      <h1>Attendance dashboard</h1>
      <p>Sign in with a one-time code sent to {DASHBOARD_EMAIL}.</p>
      {stage === "email" ? (
        <form onSubmit={requestCode}>
          <button disabled={busy} type="submit">{busy ? "Sending code…" : "Email me a sign-in code"}</button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <label htmlFor="otp-code">Six-digit sign-in code</label>
          <input
            autoComplete="one-time-code"
            autoFocus
            id="otp-code"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            pattern="[0-9]{6}"
            required
            value={code}
          />
          <button disabled={busy || code.length !== 6} type="submit">
            {busy ? "Verifying…" : "Sign in"}
          </button>
          <button disabled={busy} onClick={requestCode} type="button">Send another code</button>
        </form>
      )}
      {message && <p aria-live="polite" role="status">{message}</p>}
    </main>
  );
}