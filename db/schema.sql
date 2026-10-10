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