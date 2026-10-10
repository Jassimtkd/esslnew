# esslnew

Vercel-compatible ESSL attendance receiver. The device sends requests to one URL:

`https://<your-vercel-domain>/api/essl/<ESSL_DEVICE_KEY>`

## Configuration

Set these environment variables in the Vercel project. Do not commit real values.

- `ESSL_DEVICE_KEY`: a long, unique secret used as the device URL key.
- `DATABASE_URL`: the Neon Postgres connection string. Use the pooled connection string for Vercel.
- `ATTENDANCE_DESTINATIONS_JSON`: a JSON array of HTTPS destinations, each with its own bearer token.
- `LOG_VIEWER_USERNAME` and `LOG_VIEWER_PASSWORD`: credentials protecting the private `/logs` page.

Configure the ERP destination as:

```json
[{"url":"https://app.credencecraft.in/api/integrations/essl/attendance","token":"<ERP_BEARER_TOKEN>"}]
```

The receiver validates the device key on GET and POST. GET returns the ESSL handshake as plain text. POST forwards the raw body to every configured destination, preserving its content type. Bodies over 64 KB are rejected. The device receives plain-text `OK` only when every destination responds successfully; forwarding failures return HTTP 502 so the device can retry.

Each accepted POST is also stored in Neon before forwarding. The `essl_attendance_logs` table keeps the original bytes as base64, the content type, and the receive timestamp. Records are retained until deleted; configure a retention policy appropriate for your attendance data.

Open `https://<your-vercel-domain>/logs` to view the latest 50 stored requests. The page uses HTTP Basic authentication; set `LOG_VIEWER_USERNAME` and a strong `LOG_VIEWER_PASSWORD` in Vercel before sharing the URL. Log contents are sensitive attendance data.

## Deploy

1. Create a Neon project and copy its pooled Postgres connection string for `DATABASE_URL`.
2. Run [`db/schema.sql`](db/schema.sql) in the Neon SQL Editor to create the attendance log table.
3. Push this repository to a Git provider supported by Vercel.
4. In Vercel, create a project and import the repository. Keep the detected Next.js framework and Node.js runtime settings.
5. In the project's environment variables, add `ESSL_DEVICE_KEY`, `DATABASE_URL`, `ATTENDANCE_DESTINATIONS_JSON`, `LOG_VIEWER_USERNAME`, and `LOG_VIEWER_PASSWORD` for the environments you will deploy. Enter credentials only in Vercel's secret environment variable form.
6. Deploy the project and copy its deployment domain.
7. Configure the ESSL device with `https://<your-vercel-domain>/api/essl/<ESSL_DEVICE_KEY>`.

## Local checks

Use Node.js 20.9 or newer.

```sh
npm install
npm test
npm run dev
```
