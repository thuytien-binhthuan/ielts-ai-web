type SwitchingContext = {
  type: 'SwitchingContext'
  data: {
    text: string
    video_url: string
    part: number
  }
}

export type QuestionPart1 = {
  type: 'QuestionPart1'
  data: {
    text: string
    video_url: string
    topic: string
    sample_answer: string
    part: number

    set_code: string
    index_in_set: number
  }
}

export type QuestionPart2 = {
  type: 'QuestionPart2'
  data: {
    text: string // "Describe a time when you got lost ..."
    video_url: string // "Describe a time when you got lost."
    sample_answer: string
    topic: string
    part: number

    set_code: string
    index_in_set: number
  }
}

export type QuestionPart3 = {
  type: 'QuestionPart3'
  data: {
    text: string
    video_url: string
    sample_answer: string
    topic: string
    part: number

    set_code: string
    index_in_set: number
  }
}

export type Introduction = {
  type: 'Introduction'
  data: {
    text: string
    video_url: string
  }
}

export type Action = {
  type:
    | 'GetNextTestData'
    | 'StartTimerForPreparation'
    | 'StartTimerForSpeakingPart2'
    | 'ShowUI-CueCard'
    | 'HideUI-CueCard'
    | 'ChangeUI-Scripts'
    | 'ChangeUI-TakeNote'
    | 'EndTest'
    | 'ClearScripts'
    | 'ShowUI-TakeNote'
    | 'HideUI-TakeNote'
    | 'ChangeUI-AIFeedback'
}

export type NextQuestionResponse = (SwitchingContext | QuestionPart1 | QuestionPart2 | QuestionPart3 | Introduction) & { actionsBefore?: Action[]; actionsAfter?: Action[] }
