# ESSL Attendance Receiver

This Next.js app receives ESSL device handshakes and attendance POSTs. Attendance payloads are stored in Neon and shown in a private dashboard. Attendance logs are never forwarded; the only external API call is Resend email delivery for dashboard OTPs.

## Configuration

Set these Vercel environment variables. Never commit their values.

- `ESSL_DEVICE_KEY`: a long, unique key used in the device URL.
- `DATABASE_URL`: the Neon Postgres connection string; use Neon’s pooled connection string on Vercel.
- `AUTH_SECRET`: at least 32 random characters used to sign secure dashboard sessions.
- `RESEND_API_KEY`: API key for the Resend email service, used only to deliver dashboard sign-in codes.
- `OTP_FROM_EMAIL`: sender address on a domain verified with Resend.

The receiver URL is `https://<vercel-assigned-domain>/api/essl/<ESSL_DEVICE_KEY>`. GET returns the ESSL handshake. POST stores the raw body and responds `OK` only after the database write succeeds; it never forwards the payload. Bodies larger than 64 KB are rejected. Device serials are read from `SN`, `sn`, `deviceId`, `device_id`, or `serial` query parameters when present.

## Neon Database

1. Create a Neon Postgres project and copy its pooled connection string into `DATABASE_URL`.
2. Run [`db/schema.sql`](db/schema.sql) in the Neon SQL Editor. It creates the logs table and adds searchable columns if the earlier schema already exists.
3. Attendance records retain the exact request bytes as base64 alongside searchable text, device identifier, content type, and receive time. Records remain until manually deleted; set a retention policy appropriate for biometric data.

## Vercel Deployment

1. Import this GitHub repository into Vercel using the Next.js framework preset.
2. Create a Resend account, verify a sender domain, and create an API key for login email delivery.
3. Add `ESSL_DEVICE_KEY`, `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, and `OTP_FROM_EMAIL` to the Vercel environment. Generate `AUTH_SECRET` using a cryptographically secure random value of at least 32 characters.
4. Run the updated [`db/schema.sql`](db/schema.sql) in Neon to create the OTP table.
5. Deploy the project. Use the domain Vercel assigns; no domain is assumed by the app.
6. Set the device server URL to `https://<vercel-assigned-domain>/api/essl/<ESSL_DEVICE_KEY>`.
7. Open `https://<vercel-assigned-domain>/logs`, request a code for `jassimtkd@gmail.com`, and enter the emailed six-digit code.

Sign-in codes expire after 10 minutes, allow five verification attempts, and are limited to three requests per 15 minutes. The signed HttpOnly session lasts eight hours. The dashboard searches device identifiers, content types, and payload text; it shows 25 newest matching logs per page, with loading, empty, and retryable error states. Both the dashboard and `/api/logs` require a valid session.

## Local Checks

Use Node.js 20.9 or newer.

```sh
npm install
npm test
npm run build
npm run dev
```
