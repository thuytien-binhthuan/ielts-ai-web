import { FluencyType, GrammarType, PronunciationType, RevisedAnswerType } from '~apis/types/ielts-speaking'

export type ContentResponseBody = {
  question: string
  original_answer: string
  audio_url: null | string
  revised_answer: RevisedAnswerType
  pronunciation: PronunciationType
  grammar: GrammarType[]
  vocabulary: string[]
  fluency: FluencyType
  revised_answer_band: string
}
