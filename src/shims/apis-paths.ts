import { APIPaths as SharedAPIPaths } from "../apis/paths";

const WEB_PROXY_BASE = (process.env.NEXT_PUBLIC_ROOT_BE_URL || "/api/proxy").replace(/\/+$/, "");

function toPrefix(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().replace(/\/+$/, "");
  return normalized.length > 0 ? normalized : null;
}

const KNOWN_BACKEND_PREFIXES = Array.from(
  new Set(
    [
      toPrefix(process.env.NEXT_PUBLIC_ROOT_BE_URL),
      toPrefix(process.env.ROOT_BE_URL),
      "/proxy",
      "http://localhost:8000",
      "http://localhost:8010",
    ].filter((item): item is string => Boolean(item)),
  ),
);

function normalizePathForWeb(path: string): string {
  if (!path || path.startsWith(`${WEB_PROXY_BASE}/`)) {
    return path;
  }

  for (const prefix of KNOWN_BACKEND_PREFIXES) {
    if (prefix === WEB_PROXY_BASE) {
      continue;
    }
    if (path.startsWith(`${prefix}/`)) {
      return `${WEB_PROXY_BASE}${path.slice(prefix.length)}`;
    }
  }

  return path;
}

export const APIPaths = Object.fromEntries(
  Object.entries(SharedAPIPaths).map(([key, value]) => {
    return [key, typeof value === "string" ? normalizePathForWeb(value) : value];
  }),
) as typeof SharedAPIPaths;
