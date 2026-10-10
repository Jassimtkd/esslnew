CREATE TABLE IF NOT EXISTS essl_attendance_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_identifier TEXT,
  content_type TEXT,
  body_base64 TEXT NOT NULL,
  body_text TEXT NOT NULL DEFAULT ''
);

ALTER TABLE essl_attendance_logs
  ADD COLUMN IF NOT EXISTS device_identifier TEXT,
  ADD COLUMN IF NOT EXISTS body_text TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS essl_dashboard_otps (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  code_digest TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS essl_dashboard_otps_email_created_idx
  ON essl_dashboard_otps (email, created_at DESC);