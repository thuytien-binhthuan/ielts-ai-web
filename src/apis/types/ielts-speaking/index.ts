export type HistoryDetailResponse = {
  id: string
  test_center: string
  test_code: string
  date_of_test: Date
  test_duration_seconds: number
  overall_band_score: string
  part_records: PartRecord[]
}

export type PartRecord = {
  part: number
  set_results: SetResult[]
  band: string
}

export type SetResult = {
  set_code: string
  topic: string
  band: string
  answer_feedback_list: AnswerFeedbackList[]
}

export type AnswerFeedbackList = {
  question: string
  original_answer: string
  audio_url: string
  revised_answer: RevisedAnswerType
  revised_answer_band: string
  fluency: FluencyType
  pronunciation: PronunciationType
  grammar: GrammarType[]
  vocabulary: string[]
}

export type RevisedAnswerType = {
  text: string
  highlight_indices?: indices[]
  highlight_color?: string
}

export type FluencyType = {
  pauses: { index: number; length: number }[]
}

// PronunciationType
export type PronunciationType = {
  main_content: MainContentType
  details: DetailsType[]
}
export type MainContentType = {
  text: string
  error_indices?: indices[]
  correction_indices?: indices[]
  error_color?: string
  correction_color?: string
}
export type DetailsType = {
  text: string
  error_indices?: indices[]
  correction_indices?: indices[]
  error_color?: string
  correction_color?: string
}
//

export type GrammarType = {
  text: string
  detail: {
    category: string
    explanation: string
  }[]
}

export type indices = { start: number; end: number }
