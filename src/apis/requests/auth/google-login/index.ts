import { APIPaths } from '~apis/paths'
import { useRestAPIMutation } from '~hooks/useRestAPI'
import { HTTPMethod } from '~hooks/useRestAPI/types'

type ResponseBody = {
  access_token: string
  refresh_token: string
  token_type: string
  is_new_user: boolean
}

// type GoogleToken = {
//   id_token: string
// }
type GoogleToken = {
  user_device_data: {
    device_model: string | null
    manufacturer: string | null
    os_version: string | null
    ram: string | null
    available_storage: string | null      
    network_type: string | null
    app_version: string | null
  }
  body: {
    id_token: string
  }
}

export function GoogleLogin() {
  return useRestAPIMutation<GoogleToken, ResponseBody>({
    request: (params) => ({
      method: HTTPMethod.POST,
      configs: [APIPaths.GoogleLogin, params],
      errorTransformer: (error) => {
        switch (error?.status) {
          case 401: {
            const errorBody = error.data as any
            return {
              message: errorBody.detail,
            }
          }
          case 422: {
            const errorBody = error.data as any
            return {
              message: errorBody.detail[0]?.msg,
            }
          }
          default:{
            return error as any
          }
        }
      },
    }),
  })
}
