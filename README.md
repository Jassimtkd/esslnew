# ESSL Attendance Receiver

This Next.js app receives ESSL device handshakes and attendance POSTs. Attendance payloads are stored in Neon and displayed on the dashboard. Logs are not forwarded to any external app or API.

## Configuration

Set these Vercel environment variables. Never commit their values.

- `ESSL_DEVICE_KEY`: a long, unique key used in the device URL.
- `DATABASE_URL`: the Neon Postgres connection string; use Neon’s pooled connection string on Vercel.

The receiver URL is `https://<vercel-assigned-domain>/api/essl/<ESSL_DEVICE_KEY>`. GET returns the ESSL handshake. POST stores the raw body and responds `OK` only after the database write succeeds; it never forwards the payload. Bodies larger than 64 KB are rejected. Device serials are read from `SN`, `sn`, `deviceId`, `device_id`, or `serial` query parameters when present.

## Neon Database

1. Create a Neon Postgres project and copy its pooled connection string into `DATABASE_URL`.
2. Run [`db/schema.sql`](db/schema.sql) in the Neon SQL Editor. It creates the logs table and adds searchable columns if the earlier schema already exists.
3. Attendance records retain the exact request bytes as base64 alongside searchable text, device identifier, content type, and receive time. Records remain until manually deleted; set a retention policy appropriate for biometric data.

## Vercel Deployment

1. Import this GitHub repository into Vercel using the Next.js framework preset.
2. Set `ESSL_DEVICE_KEY` and `DATABASE_URL` in Vercel's project environment.
3. Run [`db/schema.sql`](db/schema.sql) in Neon if the attendance table has not been created yet.
4. Deploy the project. Use the domain Vercel assigns; no domain is assumed by the app.
5. Set the device server URL to `https://<vercel-assigned-domain>/api/essl/<ESSL_DEVICE_KEY>`.
6. Open the Vercel-assigned domain or append `/logs` to view the dashboard.

The homepage redirects directly to `/logs`. The dashboard searches device identifiers, content types, and payload text; shows 25 newest matching logs per page; and includes loading, empty, and error states. The dashboard and `/api/logs` have no login, as requested, so anyone with the app URL can read attendance data. Use Vercel Deployment Protection if you later want to restrict access.

## Local Checks

Use Node.js 20.9 or newer.

```sh
npm install
npm test
npm run build
npm run dev
```
