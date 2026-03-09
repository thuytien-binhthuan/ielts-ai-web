import { APIPaths } from '~apis/paths'
import { useRestAPIMutation } from '~hooks/useRestAPI'
import { HTTPMethod } from '~hooks/useRestAPI/types'
import { NextQuestionResponse } from '../types'

type RequestParams = {
  session_id: string
}

type ResponseBody = NextQuestionResponse

export function NextQuestion() {
  return useRestAPIMutation<RequestParams, ResponseBody>({
    request: (params) => ({
      method: HTTPMethod.POST,
      configs: [`${APIPaths.Speaking_Conversation}/test_session_next_data`, params],
    }),
  })
}
