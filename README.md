# ESSL Attendance Receiver

This Next.js app receives ESSL device handshakes and attendance POSTs. Attendance payloads are stored in Neon and shown in a private dashboard. The app does not forward logs or call external applications or APIs.

## Configuration

Set these Vercel environment variables. Never commit their values.

- `ESSL_DEVICE_KEY`: a long, unique key used in the device URL.
- `DATABASE_URL`: the Neon Postgres connection string; use Neon’s pooled connection string on Vercel.
- `LOG_VIEWER_USERNAME` and `LOG_VIEWER_PASSWORD`: credentials for the HTTP Basic authentication prompt protecting the dashboard and log API. Until both are configured, dashboard and log API access stays disabled; device collection is unaffected.

The receiver URL is `https://<vercel-assigned-domain>/api/essl/<ESSL_DEVICE_KEY>`. GET returns the ESSL handshake. POST stores the raw body and responds `OK` only after the database write succeeds; it never forwards the payload. Bodies larger than 64 KB are rejected. Device serials are read from `SN`, `sn`, `deviceId`, `device_id`, or `serial` query parameters when present.

## Neon Database

1. Create a Neon Postgres project and copy its pooled connection string into `DATABASE_URL`.
2. Run [`db/schema.sql`](db/schema.sql) in the Neon SQL Editor. It creates the logs table and adds searchable columns if the earlier schema already exists.
3. Attendance records retain the exact request bytes as base64 alongside searchable text, device identifier, content type, and receive time. Records remain until manually deleted; set a retention policy appropriate for biometric data.

## Vercel Deployment

1. Import this GitHub repository into Vercel using the Next.js framework preset.
2. Add `ESSL_DEVICE_KEY`, `DATABASE_URL`, `LOG_VIEWER_USERNAME`, and `LOG_VIEWER_PASSWORD` to the deployment environment.
3. Deploy the project. Use the domain Vercel assigns; no domain is assumed by this app.
4. Set the device server URL to `https://<vercel-assigned-domain>/api/essl/<ESSL_DEVICE_KEY>`.
5. Open `https://<vercel-assigned-domain>/logs` and enter the configured dashboard username and password.

The dashboard searches device identifiers, content types, and payload text; it shows 25 newest matching logs per page, with loading, empty, and retryable error states. The `/api/logs` endpoint uses the same authentication and is not publicly accessible.

## Local Checks

Use Node.js 20.9 or newer.

```sh
npm install
npm test
npm run build
npm run dev
```
