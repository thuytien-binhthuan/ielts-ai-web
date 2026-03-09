import { APIPaths } from '~apis/paths'
import { useRestAPIQuery } from '~hooks/useRestAPI'
import { HTTPMethod } from '~hooks/useRestAPI/types'

type RequestParams = {}

type ResponseBody = string[]

export function Speaking_Get_Tags_Screen_Practice(enabled = true) {
  return useRestAPIQuery<RequestParams, ResponseBody>({
    request: (params) => ({
      method: HTTPMethod.GET,
      configs: [APIPaths.Speaking_GetTagsScreenPractice],
    }),
    queryKey: ['Speaking_GetTagsScreenPractice'],
    enabled,
  })
}
