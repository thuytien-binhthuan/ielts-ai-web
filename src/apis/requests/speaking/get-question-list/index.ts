import { APIPaths } from '~apis/paths'
import { useRestAPIMutation } from '~hooks/useRestAPI'
import { HTTPMethod } from '~hooks/useRestAPI/types'

type RequestParams = {
  item_code: string
}

type ResponseBody = {
  part: number
  questions: string[]
}[]

export function GetQuestionList() {
  return useRestAPIMutation<RequestParams, ResponseBody>({
    request: (params) => ({
      method: HTTPMethod.POST,
      configs: [`${APIPaths.Speaking_GetQuestionList}`, params],
    }),
  })
}
