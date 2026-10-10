import { NextResponse } from "next/server";
import { createLogAuthFailure } from "./lib/log-auth.js";

export function proxy(request) {
  const authFailure = createLogAuthFailure(
    request.headers.get("authorization"),
    process.env.LOG_VIEWER_USERNAME,
    process.env.LOG_VIEWER_PASSWORD,
  );

  if (authFailure) return authFailure;

  return NextResponse.next({ headers: { "cache-control": "private, no-store" } });
}

export const config = {
  matcher: ["/logs/:path*", "/api/logs/:path*"],
};