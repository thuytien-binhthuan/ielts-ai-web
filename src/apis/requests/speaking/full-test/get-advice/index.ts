import { HttpStatusCode } from 'axios'
import { APIPaths } from '~apis/paths'
import { useRestAPIMutation } from '~hooks/useRestAPI'
import { HTTPMethod } from '~hooks/useRestAPI/types'
import { ContentResponseBody } from './type'

type RequestParams = {
  session_id: string
  set_code: string
  index_in_set: number
  signal?: AbortSignal
}

type ResponseBody = ContentResponseBody

export function GetAdvice() {
  return useRestAPIMutation<RequestParams, ResponseBody>({
    request: (params) => ({
      method: HTTPMethod.POST,
      configs: [`${APIPaths.Speaking_GetAdvice}`, params],
    }),
  })
}
type RequestParamsFailed = {
  error_code: HttpStatusCode
  time_in_second: number
}
type ResponseBodyFailed = {
  detail: string
  error_code: HttpStatusCode
}
export function GetAdviceFailedCase() {
  return useRestAPIMutation<RequestParamsFailed, ResponseBodyFailed>({
    request: (params) => ({
      method: HTTPMethod.POST,
      configs: [`${APIPaths.Speaking_GetAdvice_FailedCase}`, params],
    }),
  })
}
