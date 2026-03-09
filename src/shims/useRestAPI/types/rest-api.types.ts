import type {
  MutationKey,
  QueryKey,
} from "@tanstack/react-query";
import type { Request } from "./request.types";

type UseRestAPIGeneric<RequestParams, ResponseBody> = {
  request: (params: RequestParams) => Request<ResponseBody>;
};

export type UseRestAPIQueryProps<RequestParams, ResponseBody> =
  UseRestAPIGeneric<RequestParams, ResponseBody> & {
    queryKey: QueryKey;
    enabled?: boolean;
    staleTime?: number;
  };

export type UseRestAPIMutationProps<RequestParams, ResponseBody> =
  UseRestAPIGeneric<RequestParams, ResponseBody> & {
    mutationKey?: MutationKey;
  };

export type UseInfiniteRestAPIQueryProps<RequestParams, ResponseBody> =
  UseRestAPIGeneric<RequestParams, ResponseBody> & {
    queryKey: QueryKey;
    enabled?: boolean;
  };
