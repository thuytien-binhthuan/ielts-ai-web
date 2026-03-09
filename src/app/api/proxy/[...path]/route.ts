import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM_BASE_URL = process.env.BE_PROXY_TARGET ?? "http://localhost:8010";
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 400;
const REQUEST_TIMEOUT_MS = 120000;

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

function hasRequestBody(method: string): boolean {
  return !["GET", "HEAD"].includes(method.toUpperCase());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetriableProxyError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error && typeof (error as { message?: unknown }).message === "string" ? (error as { message: string }).message.toLowerCase() : "";
  const causeCode =
    "cause" in error && (error as { cause?: unknown }).cause && typeof (error as { cause: { code?: unknown } }).cause.code === "string"
      ? String((error as { cause: { code: string } }).cause.code).toUpperCase()
      : "";

  return (
    message.includes("socket hang up") ||
    message.includes("econnreset") ||
    message.includes("network") ||
    message.includes("timeout") ||
    causeCode === "ECONNRESET" ||
    causeCode === "ETIMEDOUT"
  );
}

function getErrorDetail(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "Unknown proxy error";
}

function filterRequestHeaders(requestHeaders: Headers): Headers {
  const headers = new Headers(requestHeaders);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("sec-fetch-site");
  headers.delete("sec-fetch-mode");
  headers.delete("sec-fetch-dest");
  headers.delete("sec-fetch-user");
  headers.set("accept-encoding", "identity");
  return headers;
}

function filterResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers(upstreamHeaders);
  headers.delete("connection");
  headers.delete("transfer-encoding");
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("keep-alive");
  return headers;
}

async function forwardToUpstream(request: NextRequest, path: string[]): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const upstreamPath = path.join("/");
  const upstreamUrl = new URL(`${UPSTREAM_BASE_URL.replace(/\/+$/, "")}/${upstreamPath}`);
  upstreamUrl.search = incomingUrl.search;

  const method = request.method.toUpperCase();
  const headers = filterRequestHeaders(request.headers);
  const bodyBuffer = hasRequestBody(method) ? Buffer.from(await request.arrayBuffer()) : undefined;

  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method,
        headers,
        body: bodyBuffer,
        signal: controller.signal,
        cache: "no-store",
        redirect: "manual",
      });

      clearTimeout(timeout);

      const responseHeaders = filterResponseHeaders(upstreamResponse.headers);
      const responseBody = await upstreamResponse.arrayBuffer();
      return new Response(responseBody, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (attempt < RETRY_ATTEMPTS - 1 && isRetriableProxyError(error)) {
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }

      break;
    }
  }

  console.error("BE proxy failed", {
    method,
    upstream: upstreamUrl.toString(),
    error: getErrorDetail(lastError),
  });

  return Response.json(
    {
      detail: "Proxy request failed",
      error: getErrorDetail(lastError),
    },
    { status: 502 },
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return forwardToUpstream(request, params.path ?? []);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return forwardToUpstream(request, params.path ?? []);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return forwardToUpstream(request, params.path ?? []);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return forwardToUpstream(request, params.path ?? []);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return forwardToUpstream(request, params.path ?? []);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return forwardToUpstream(request, params.path ?? []);
}
