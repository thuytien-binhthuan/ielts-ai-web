import { APIPaths } from '~apis/paths'
import { useRestAPIMutation } from '~hooks/useRestAPI'
import { HTTPMethod } from '~hooks/useRestAPI/types'
import { MainScreenContent } from '~types/apis/app-content'

type RequestParams = {
  tags: string,
  app_version: string,
}

type ResponseBody = MainScreenContent

export function Speaking_GetMain_Screen_Practice() {
  return useRestAPIMutation<RequestParams, ResponseBody>({
    request: (params) => ({
      method: HTTPMethod.GET,
      configs: [APIPaths.Speaking_GetMainScreenPractice, { params }],
    }),
    mutationKey: ['Speaking_GetMainScreenPractice'],
  })
}
