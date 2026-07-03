import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {

  // 1. Generate unique request & correlation IDs
  const requestId = crypto.randomUUID();
  const correlationId = request.headers.get("x-correlation-id") || crypto.randomUUID();

  // Clone headers and set IDs for propagation
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-correlation-id", correlationId);

  // 2. Define Content Security Policy (CSP)
  // Restricts source loading to 'self' and whitelisted endpoints (NVIDIA, Upstash, Sentry)
  const cspHeaderKey = "Content-Security-Policy";
  const cspRules = [
    "default-src 'self';",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
    "style-src 'self' 'unsafe-inline';",
    "img-src 'self' blob: data:;",
    "font-src 'self' data:;",
    "connect-src 'self' https://integrate.api.nvidia.com https://*.sentry.io https://free-mutt-141625.upstash.io;",
    "frame-ancestors 'none';",
    "upgrade-insecure-requests;"
  ].join(" ");

  // 3. Initialize Response with request headers propagation
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 4. Inject Security Headers
  response.headers.set(cspHeaderKey, cspRules);
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("X-Correlation-Id", correlationId);

  // HSTS (Strict-Transport-Security): Enforces HTTPS connection browser-wide (max-age: 2 years)
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  // X-Frame-Options: Prevents clickjacking by blocking rendering within iframe elements
  response.headers.set("X-Frame-Options", "DENY");

  // Referrer-Policy: Prevents leaking referrer values on cross-origin requests
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // X-Content-Type-Options: Enforces MIME-type matching (stops browsers sniffing non-style sheets)
  response.headers.set("X-Content-Type-Options", "nosniff");

  return response;
}

// Apply middleware configuration globally except for asset/favicon directories
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
