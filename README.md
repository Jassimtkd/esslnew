# ESSL Attendance Receiver

This Next.js app receives ESSL device handshakes and attendance POSTs. Attendance payloads are stored in Neon and displayed on the dashboard. Logs are not forwarded to any external app or API.

## Configuration

Set `DATABASE_URL` in Vercel. No device key or app login is required for the simple receiver URL.

- `DATABASE_URL`: the Neon Postgres connection string; use Neon’s pooled connection string on Vercel.

Configure the device with `https://<vercel-assigned-domain>/api/essl`. Do not use `/logs` as the device URL. GET returns the ESSL handshake. POST stores the raw body and responds `OK` only after the database write succeeds; it never forwards the payload. Bodies larger than 64 KB are rejected. Each POST writes an `ESSL_POST_RECEIPT` runtime log containing only timestamp, HTTP status, and byte count—never payloads, identifiers, or tokens. Check these under the Vercel project's Runtime Logs after a test scan. Device serials are read from `SN`, `sn`, `deviceId`, `device_id`, or `serial` query parameters when present.

## Neon Database

1. Create a Neon Postgres project and set its pooled connection string as `DATABASE_URL` in Vercel.
2. On first access, the app creates the logs table and required columns automatically. [`db/schema.sql`](db/schema.sql) is also available for manual setup.
3. Attendance records retain the exact request bytes as base64 alongside searchable text, device identifier, content type, and receive time. Records remain until manually deleted; set a retention policy appropriate for biometric data.

## Vercel Deployment

1. Import this GitHub repository into Vercel using the Next.js framework preset.
2. Set `DATABASE_URL` in Vercel's project environment.
3. Confirm the Vercel project has the Neon-provided `DATABASE_URL` environment variable.
4. Deploy the project. Use the domain Vercel assigns; no domain is assumed by the app.
5. Set the device server URL to `https://<vercel-assigned-domain>/api/essl`.
6. Open the Vercel-assigned domain or append `/logs` to view the dashboard.

The homepage opens the dashboard directly. Its left sidebar has two modules: **Devices** lists detected device identifiers, log counts, and last activity; **Logs** searches device identifiers, content types, and payload text and shows 25 newest matching records per page. Both modules include loading, empty, and error states. The dashboard and its APIs have no login, as requested, so anyone with the app URL can read attendance data. Use Vercel Deployment Protection if you later want to restrict access.

## Local Checks

Use Node.js 20.9 or newer.

```sh
npm install
npm test
npm run build
npm run dev
```
