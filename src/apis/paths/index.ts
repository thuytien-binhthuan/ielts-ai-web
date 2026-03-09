import { BASE_URL_LOCATION } from '~configs/constants'

const PYTHON_BE_API_URL = process.env.NEXT_PUBLIC_ROOT_BE_URL ?? process.env.ROOT_BE_URL

export const APIPaths = {
  //============================= SPEAKING =============================

  //api speech to text - text to speech
  // Speaking_ListAvailableEnglishSpeaker: `${BASE_API_URL}/text-to-speech/list-available-english-speaker`,
  // SearchYoutubeVideos: `${BASE_KEDU_API_URL}/public`,
  // GetVideoDetail: `${BASE_KEDU_API_URL}/public`,

  //api User-Authentication
  SignUp: `${PYTHON_BE_API_URL}/v1/auth/signup`,
  Login: `${PYTHON_BE_API_URL}/v1/auth/login`,
  GetUserProfile: `${PYTHON_BE_API_URL}/v1/user/profile`,
  UpdateUserProfile: `${PYTHON_BE_API_URL}/v1/user/profile`,
  ContactSupport: `${PYTHON_BE_API_URL}/v1/support/`,
  GoogleLogin: `${PYTHON_BE_API_URL}/v1/auth/google-login`,
  Deactivate: `${PYTHON_BE_API_URL}/v1/user/deactivate`,
  AppleLogin: `${PYTHON_BE_API_URL}/v1/auth/apple-login`,

  //api User Subscriptions
  Get_TotalUsedSpeakingDuration: `${PYTHON_BE_API_URL}/v1/subscriptions/quotas/user-total-used-speaking-duration`,
  Get_SubscriptionsDetails: `${PYTHON_BE_API_URL}/v1/subscriptions/get_plan_details`,
  Get_AvailablePlans: `${PYTHON_BE_API_URL}/v1/subscriptions/available-plans`,
  Create_SubscriptionTransaction: `${PYTHON_BE_API_URL}/v1/subscriptions/create_subscription_transaction`,
  Update_SubscriptionTransaction: `${PYTHON_BE_API_URL}/v1/subscriptions/update_subscription_transaction`,
  Create_SubscriptionTransactionAndroid: `${PYTHON_BE_API_URL}/v1/subscriptions/subscribe_to_plan_for_android`,
  Get_LatestSuccessfulTransactionId: `${PYTHON_BE_API_URL}/v1/subscriptions/get_latest_successful_transaction_id`,

  //api home screen
  Speaking_GetMainScreenData: `${PYTHON_BE_API_URL}/v1/home/speaking`,
  Speaking_GetMainScreenExam: `${PYTHON_BE_API_URL}/v1/home/exam/speaking`,
  Speaking_GetMainScreenHistory: `${PYTHON_BE_API_URL}/v1/home/history/speaking`,
  Speaking_GetMainScreenPractice: `${PYTHON_BE_API_URL}/v1/home/practice/speaking`,
  Speaking_SeeAllPartsScreenPractice: `${PYTHON_BE_API_URL}/v1/home/practice/speaking/sets`,
  Speaking_GetTagsScreenPractice: `${PYTHON_BE_API_URL}/v1/home/tags`,

  //api feedback
  Speaking_Conversation: `${PYTHON_BE_API_URL}/v1/feedback`,
  Speaking_FullTest: `${PYTHON_BE_API_URL}/v1/feedback`,
  Speaking_GetSetById: `${PYTHON_BE_API_URL}/v1/sets`,

  Speaking_GetAnswerIdea: `${PYTHON_BE_API_URL}/v1/feedback/get_answer_idea`,
  Speaking_GetQuestionList: `${PYTHON_BE_API_URL}/v1/feedback/get_question_list`,
  // Speaking_GetAdvice: `${PYTHON_BE_API_URL}/v1/feedback/get_retrieve_improved_answer`, // get Advice old
  Speaking_GetAdvice: `${PYTHON_BE_API_URL}/v1/feedback/test_session_get_answer_feedback`,
  Speaking_GetAdvice_FailedCase: `${PYTHON_BE_API_URL}/v1/feedback/test_session_get_answer_feedback_failed_case`,

  //api history
  Speaking_HistoryItem: `${PYTHON_BE_API_URL}/v1/history/items`, //history item home
  // Speaking_HistoryDetail: `${PYTHON_BE_API_URL}/ielts-speaking/history-detail`,
  Speaking_HistoryDetail: `${PYTHON_BE_API_URL}/v1/history/detail_ui_format`,

  //api get location
  AppContent_Location_GetCountries: `${BASE_URL_LOCATION}/v1/app-content/locations/countries`,
  AppContent_Location_GetProvinces: `${BASE_URL_LOCATION}/v1/app-content/locations/provinces`,

  //api onboarding
  Get_Onboarding_Survey: `${PYTHON_BE_API_URL}/v1/onboarding/get-onboarding-survey`,
  Get_List_Of_Hobbies: `${PYTHON_BE_API_URL}/v1/onboarding/hobbies`,
  Save_Onboarding_Survey: `${PYTHON_BE_API_URL}/v1/onboarding/save-onboarding-survey`,

  //============================= WRITING =============================

  // SentencesLookup: `${BASE_API_URL}/translation/sentences-lookup`,
  // Writing_Samples: `${BASE_API_URL}/ielts-writing/samples`,
}
