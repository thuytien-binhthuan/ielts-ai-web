import { APIPaths } from '~apis/paths'
import { useRestAPIMutation } from '~hooks/useRestAPI'
import { HTTPMethod } from '~hooks/useRestAPI/types'
import { SeeAllContent } from '~types/apis/app-content'

export type RequestParams = {
  tags: string
  part: number
  page: number
  pageSize: number
}

type ResponseBody = SeeAllContent

export function Speaking_SeeAllPartsScreenPractice() {
  return useRestAPIMutation<RequestParams, ResponseBody>({
    request: (params) => ({
      method: HTTPMethod.GET,
      configs: [APIPaths.Speaking_SeeAllPartsScreenPractice, { params }],
    }),
    mutationKey: ['Speaking_SeeAllPartsScreenPractice'],
  })
}
