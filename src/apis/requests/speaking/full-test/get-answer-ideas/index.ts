import { APIPaths } from '~apis/paths'
import { useRestAPIMutation } from '~hooks/useRestAPI'
import { HTTPMethod } from '~hooks/useRestAPI/types'

type RequestParams = {
  session_id: string
  part: number
  question: string
}

type ResponseBody = {
  idea: string
  sample_answer: string
  vocabulary: string[]
}

export function GetAnswerIdeas() {
  return useRestAPIMutation<RequestParams, ResponseBody>({
    request: (params) => ({
      method: HTTPMethod.POST,
      configs: [`${APIPaths.Speaking_GetAnswerIdea}`, params],
    }),
  })
}
