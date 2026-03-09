import type { Axios, AxiosError } from "axios";
import { HTTPMethod } from "./http-methods.types";

type GETRequest<ResponseBody> = {
  method: HTTPMethod.GET;
  configs: Parameters<Axios[HTTPMethod.GET]>;
  successTransformer?: (data: ResponseBody) => ResponseBody;
  errorTransformer?: (error: AxiosError["response"]) => { message: string } | void;
};

type POSTRequest<ResponseBody> = {
  method: HTTPMethod.POST;
  configs: Parameters<Axios[HTTPMethod.POST]>;
  successTransformer?: (data: ResponseBody) => ResponseBody;
  errorTransformer?: (error: AxiosError["response"]) => { message: string } | void;
};

type PUTRequest<ResponseBody> = {
  method: HTTPMethod.PUT;
  configs: Parameters<Axios[HTTPMethod.PUT]>;
  successTransformer?: (data: ResponseBody) => ResponseBody;
  errorTransformer?: (error: AxiosError["response"]) => { message: string } | void;
};

type PATCHRequest<ResponseBody> = {
  method: HTTPMethod.PATCH;
  configs: Parameters<Axios[HTTPMethod.PATCH]>;
  successTransformer?: (data: ResponseBody) => ResponseBody;
  errorTransformer?: (error: AxiosError["response"]) => { message: string } | void;
};

type DELETERequest<ResponseBody> = {
  method: HTTPMethod.DELETE;
  configs: Parameters<Axios[HTTPMethod.DELETE]>;
  successTransformer?: (data: ResponseBody) => ResponseBody;
  errorTransformer?: (error: AxiosError["response"]) => { message: string } | void;
};

export type Request<ResponseBody> =
  | GETRequest<ResponseBody>
  | POSTRequest<ResponseBody>
  | PUTRequest<ResponseBody>
  | PATCHRequest<ResponseBody>
  | DELETERequest<ResponseBody>;
