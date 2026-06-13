export interface MorseSymbol {
  char: string
  code: string
}

export type TrainMode = 'charToCode' | 'codeToChar' | 'audioToChar' | 'typingToCode'

export interface HistoryEntry {
  id: number
  input: string
  output: string
  correct: boolean
  timestamp: number
}

export interface DailyChallengeTask {
  char: string
  code: string
  userAnswer: string
  correct: boolean | null
}

export interface DailyChallengeRecord {
  date: string
  completed: boolean
  correctCount: number
  totalCount: number
  streak: number
}

export interface DailyChallengeState {
  currentDate: string
  tasks: DailyChallengeTask[]
  currentIndex: number
  completed: boolean
  streak: number
  records: DailyChallengeRecord[]
}
