import { timingSafeEqual } from "node:crypto";

function secureEqual(value, expected) {
  const actualBytes = Buffer.from(value);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function hasLogViewerAccess(authorization, username, password) {
  if (!authorization || !username || !password) return false;

  const match = /^Basic\s+([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
  if (!match) return false;

  const credentials = Buffer.from(match[1], "base64").toString("utf8");
  const separator = credentials.indexOf(":");
  if (separator < 0) return false;

  return (
    secureEqual(credentials.slice(0, separator), username) &&
    secureEqual(credentials.slice(separator + 1), password)
  );
}