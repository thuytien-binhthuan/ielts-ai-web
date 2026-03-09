import { APIPaths } from '~apis/paths'
import { useRestAPIMutation } from '~hooks/useRestAPI'
import { HTTPMethod } from '~hooks/useRestAPI/types'

type RequestParams = {
  setId: string
}

export type Question = {
  text: string
  question_index: number
}

type ResponseBody = {
  name: string
  part: number
  description: string
  topics: string
  free: boolean
  active: boolean
  uuid: string
  code: string
  timestamp_added: Date
  cover: string
  questions: Question[]
}

export function Speaking_GetSetById() {
  return useRestAPIMutation<RequestParams, ResponseBody>({
    request: (params) => ({
      method: HTTPMethod.GET,
      configs: [`${APIPaths.Speaking_GetSetById}/${params?.setId}`],
    }),
  })
}
