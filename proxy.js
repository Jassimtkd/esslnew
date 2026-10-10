import { NextResponse } from "next/server";
import { hasLogViewerAccess } from "./lib/log-auth.js";

export function proxy(request) {
  const authorized = hasLogViewerAccess(
    request.headers.get("authorization"),
    process.env.LOG_VIEWER_USERNAME,
    process.env.LOG_VIEWER_PASSWORD,
  );

  if (!authorized) {
    return new Response("Authentication required", {
      status: 401,
      headers: {
        "cache-control": "no-store",
        "www-authenticate": 'Basic realm="Attendance logs", charset="UTF-8"',
      },
    });
  }

  return NextResponse.next({ headers: { "cache-control": "private, no-store" } });
}

export const config = {
  matcher: ["/logs/:path*"],
};