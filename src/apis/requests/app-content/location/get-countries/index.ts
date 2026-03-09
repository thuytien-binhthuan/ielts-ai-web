import { APIPaths } from '~apis/paths'
import { useRestAPIQuery } from '~hooks/useRestAPI'
import { HTTPMethod } from '~hooks/useRestAPI/types'
import { Country } from '~types/apis/app-content'

type RequestParams = {}

type ResponseBody = Country[]

export function AppContent_Location_GetCountries() {
  return useRestAPIQuery<RequestParams, ResponseBody>({
    request: (params) => ({
      method: HTTPMethod.GET,
      configs: [APIPaths.AppContent_Location_GetCountries],
    }),
    queryKey: ['AppContent_Location_GetCountries'],
  })
}
