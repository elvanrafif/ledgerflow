import "server-only";
import { DEFAULT_API_BASE_URL } from "@/lib/api-client";
import { rewriteCookieDomain } from "@/lib/proxy-cookie";

/**
 * Same-origin proxy to the LedgerFlow API.
 *
 * The API is served from its own origin (api.example.com) while the web app
 * lives on another (app.example.com). A cookie set by the API belongs to the
 * API domain, so the web app's Server Components — which read cookies via
 * `next/headers` — can never see it, and server-side fetches like /dashboard
 * come back 401. Routing every API call through this handler keeps the session
 * cookie on the web origin: the API's `Set-Cookie` is rewritten to drop the
 * `Domain` attribute so the browser stores it for the web app instead.
 *
 * The upstream Secret/URL is never exposed to the browser.
 */

const FORWARD_REQUEST_HEADERS = ["content-type", "accept", "idempotency-key", "cookie"];
const FORWARD_RESPONSE_HEADERS = ["content-type"];

function upstreamBaseUrl(): string {
  return (
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");
}

async function forward(request: Request, path: string[]): Promise<Response> {
  const target = `${upstreamBaseUrl()}/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // The API's CSRF guard requires Origin to equal the web origin. The browser
  // sends its own Origin for same-origin fetches, but a server-side forward may
  // not carry one, so set it from the Next.js env we already trust.
  const origin = request.headers.get("origin");
  if (origin) headers.set("origin", origin);

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  const upstream = await fetch(target, {
    method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  for (const setCookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", rewriteCookieDomain(setCookie));
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

// Next.js 15 passes route params as a promise.
type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: RouteContext) {
  return forward(request, (await params).path);
}

export async function POST(request: Request, { params }: RouteContext) {
  return forward(request, (await params).path);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return forward(request, (await params).path);
}

export async function PUT(request: Request, { params }: RouteContext) {
  return forward(request, (await params).path);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  return forward(request, (await params).path);
}
