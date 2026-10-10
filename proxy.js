import { NextResponse } from "next/server.js";
import { DASHBOARD_SESSION_COOKIE, hasDashboardSession } from "./lib/log-auth.js";

export function proxy(request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (!request.nextUrl.pathname.startsWith("/api/")) {
      return Response.redirect(new URL("/login", request.url));
    }

    return new Response("Dashboard authentication is not configured", {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }

  const session = request.cookies.get(DASHBOARD_SESSION_COOKIE)?.value;
  if (!hasDashboardSession(session, secret)) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401, headers: { "cache-control": "no-store" } },
      );
    }
    return Response.redirect(new URL("/login", request.url));
  }

  return NextResponse.next({ headers: { "cache-control": "private, no-store" } });
}

export const config = {
  matcher: ["/logs/:path*", "/api/logs/:path*"],
};