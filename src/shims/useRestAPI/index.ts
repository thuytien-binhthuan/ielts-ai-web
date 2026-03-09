import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import axios from "axios";
import React from "react";
import { HTTPMethod } from "./types";
import type * as Types from "./types";

const ACCESS_TOKEN_KEY = "ACCESS_TOKEN";
const NETWORK_RETRY_ATTEMPTS = 3;
const NETWORK_RETRY_DELAY_MS = 350;
const WEB_PROXY_BASE = (process.env.NEXT_PUBLIC_ROOT_BE_URL ?? "/api/proxy").replace(/\/+$/, "");

function normalizeRequestUrlForWeb(url: string): string {
  if (!url) {
    return url;
  }

  if (url.startsWith(`${WEB_PROXY_BASE}/`)) {
    return url;
  }

  if (url.startsWith("/proxy/")) {
    return `${WEB_PROXY_BASE}${url.slice("/proxy".length)}`;
  }

  if (!/^https?:\/\//i.test(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const isBackendApiPath = parsed.pathname.startsWith("/v1/");
    if (!isBackendApiPath) {
      return url;
    }

    return `${WEB_PROXY_BASE}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function normalizeRequestConfigs(configs: ReadonlyArray<unknown>): ReadonlyArray<unknown> {
  if (typeof configs[0] !== "string") {
    return configs;
  }

  const normalizedUrl = normalizeRequestUrlForWeb(configs[0]);
  if (normalizedUrl === configs[0]) {
    return configs;
  }

  const nextConfigs = [...configs];
  nextConfigs[0] = normalizedUrl;
  return nextConfigs;
}

function getAccessTokenFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function addAuthorizationHeader(
  method: Types.HTTPMethod,
  configs: ReadonlyArray<unknown>,
): ReadonlyArray<unknown> {
  const requestUrl = typeof configs[0] === "string" ? configs[0] : "";
  if (requestUrl.includes("/v1/auth/")) {
    return configs;
  }

  const accessToken = getAccessTokenFromStorage();
  if (!accessToken) {
    return configs;
  }

  const authHeader = { Authorization: `Bearer ${accessToken}` };

  const toConfigObject = (value: unknown): Record<string, unknown> => {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return { ...(value as Record<string, unknown>) };
    }
    return {};
  };

  if (method === HTTPMethod.GET || method === HTTPMethod.DELETE) {
    const requestConfig = toConfigObject(configs[1]);
    const existingHeaders = toConfigObject(requestConfig.headers);
    const mergedConfig = {
      ...requestConfig,
      headers: {
        ...existingHeaders,
        ...authHeader,
      },
    };

    return [configs[0], mergedConfig];
  }

  const requestBody = configs[1];
  const requestConfig = toConfigObject(configs[2]);
  const existingHeaders = toConfigObject(requestConfig.headers);
  const mergedConfig = {
    ...requestConfig,
    headers: {
      ...existingHeaders,
      ...authHeader,
    },
  };

  return [configs[0], requestBody, mergedConfig];
}

async function getAxiosRequestFn<ResponseBody>(request: Types.Request<ResponseBody>) {
  const normalizedConfigs = normalizeRequestConfigs(request.configs as unknown[]);
  const requestConfigs = addAuthorizationHeader(
    request.method,
    normalizedConfigs,
  );
  const requestUrl = typeof requestConfigs[0] === "string" ? requestConfigs[0] : "";

  for (let attempt = 0; attempt < NETWORK_RETRY_ATTEMPTS; attempt += 1) {
    try {
      // Request shapes are defined in the shared layer and align with Axios method signatures.
      const response = await (axios[request.method] as (...args: unknown[]) => Promise<{ data: ResponseBody }>)(
        ...requestConfigs,
      );

      // Keep parity with the mobile implementation: response transformers are not applied in the request utility.
      return response.data;
    } catch (error: unknown) {
      const errorResponse =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: unknown }).response
          : undefined;

      if (typeof request.errorTransformer === "function") {
        const transformedError = request.errorTransformer(
          errorResponse as Parameters<NonNullable<typeof request.errorTransformer>>[0],
        );
        if (transformedError) {
          throw transformedError;
        }
      }

      if (errorResponse) {
        throw errorResponse;
      }

      const message =
        error instanceof Error ? error.message.toLowerCase() : "";
      const isRetriableNetworkError =
        message.includes("network error") ||
        message.includes("socket hang up") ||
        message.includes("econnreset") ||
        message.includes("timeout");

      if (isRetriableNetworkError && attempt < NETWORK_RETRY_ATTEMPTS - 1) {
        await new Promise((resolve) => {
          setTimeout(resolve, NETWORK_RETRY_DELAY_MS * (attempt + 1));
        });
        continue;
      }

      if (error instanceof Error) {
        throw new Error(`${error.message} (url: ${requestUrl || "unknown"})`);
      }
      throw new Error(`Unknown request error (url: ${requestUrl || "unknown"})`);
    }
  }

  throw new Error(`Unknown request error (url: ${requestUrl || "unknown"})`);
}

export function useRestAPIQuery<RequestParams = unknown, ResponseBody = unknown>(
  props: Types.UseRestAPIQueryProps<RequestParams, ResponseBody>,
) {
  const axiosRequestFn = React.useCallback(() => {
    return getAxiosRequestFn<ResponseBody>(props.request({} as RequestParams));
  }, [props]);

  return useQuery<ResponseBody>({
    queryKey: props.queryKey,
    enabled: props.enabled,
    queryFn: axiosRequestFn,
    staleTime: props.staleTime ?? 5 * 60 * 1000,
  });
}

export function useRestAPIMutation<RequestParams = unknown, ResponseBody = unknown>(
  props: Types.UseRestAPIMutationProps<RequestParams, ResponseBody>,
) {
  const axiosRequestFn = React.useCallback(
    (requestParams: RequestParams) => {
      return getAxiosRequestFn<ResponseBody>(props.request(requestParams));
    },
    [props],
  );

  return useMutation<ResponseBody, Error, RequestParams>({
    mutationKey: props.mutationKey,
    mutationFn: (requestParams: RequestParams) => axiosRequestFn(requestParams),
  });
}

export function useInfiniteRestAPIQuery<RequestParams = unknown, ResponseBody = unknown>(
  props: Types.UseInfiniteRestAPIQueryProps<RequestParams, ResponseBody>,
) {
  const axiosRequestFn = React.useCallback(
    (requestParams: RequestParams) => {
      return getAxiosRequestFn<ResponseBody>(props.request(requestParams));
    },
    [props],
  );

  return useInfiniteQuery<ResponseBody, Error, InfiniteData<ResponseBody>, ReadonlyArray<unknown>, RequestParams>({
    queryKey: props.queryKey,
    enabled: props.enabled,
    queryFn: ({ pageParam }) => axiosRequestFn((pageParam ?? ({} as RequestParams)) as RequestParams),
    initialPageParam: {} as RequestParams,
    getNextPageParam: () => undefined,
  });
}
