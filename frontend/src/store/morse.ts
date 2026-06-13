import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { MORSE_TABLE, REVERSE_TABLE, textToMorse, morseToText } from '../utils/morse-code'
import type { TrainMode, HistoryEntry, DailyChallengeTask, DailyChallengeRecord } from '../types'

export const useMorseStore = defineStore('morse', () => {
  const inputText = ref('')
  const morseOutput = ref('')
  const decodedText = ref('')
  const wpm = ref(15)
  const frequency = ref(700)
  const volume = ref(0.6)
  const trainMode = ref<TrainMode>('charToCode')
  const history = ref<HistoryEntry[]>([])
  const quizChar = ref('')
  const userAnswer = ref('')
  const score = ref({ correct: 0, total: 0 })
  const isPlaying = ref(false)
  let audioCtx: AudioContext | null = null
  let currentOscillator: OscillatorNode | null = null

  const dailyTasks = ref<DailyChallengeTask[]>([])
  const dailyCurrentIndex = ref(0)
  const dailyCompleted = ref(false)
  const dailyStreak = ref(0)
  const dailyRecords = ref<DailyChallengeRecord[]>([])
  const dailyUserAnswer = ref('')

  const DAILY_TASK_COUNT = 10
  const STORAGE_KEY_DAILY = 'morse_daily_challenge'

  const dotDuration = computed(() => 1200 / wpm.value)

  function getAudioCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext()
    return audioCtx
  }

  function playTone(duration: number): Promise<void> {
    return new Promise(resolve => {
      const ctx = getAudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency.value
      gain.gain.value = volume.value
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      currentOscillator = osc
      setTimeout(() => { osc.stop(); currentOscillator = null; resolve() }, duration)
    })
  }

  async function playMorse(morse: string) {
    isPlaying.value = true
    const dd = dotDuration.value
    for (const token of morse.split(' ')) {
      if (token === '/') { await sleep(dd * 7); continue }
      for (const sym of token) {
        await playTone(sym === '.' ? dd : dd * 3)
        await sleep(dd)
      }
      await sleep(dd * 2)
    }
    isPlaying.value = false
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  function encode() {
    morseOutput.value = textToMorse(inputText.value)
  }

  function decode() {
    decodedText.value = morseToText(inputText.value)
  }

  function generateQuiz() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    quizChar.value = chars[Math.floor(Math.random() * chars.length)]
    userAnswer.value = ''
  }

  function checkAnswer() {
    const correct = userAnswer.value.trim() === MORSE_TABLE[quizChar.value]
    score.value.total++
    if (correct) score.value.correct++
    history.value.unshift({
      id: Date.now(), input: quizChar.value, output: userAnswer.value,
      correct, timestamp: Date.now()
    })
    generateQuiz()
  }

  function resetScore() {
    score.value = { correct: 0, total: 0 }
    history.value = []
  }

  function getTodayString(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  function seededRandom(seed: number): () => number {
    let s = seed
    return function () {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
  }

  function generateDailyTasks(dateStr: string): DailyChallengeTask[] {
    const seed = dateStr.split('-').map(Number).reduce((a, b) => a * 100 + b, 0)
    const random = seededRandom(seed)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const tasks: DailyChallengeTask[] = []
    for (let i = 0; i < DAILY_TASK_COUNT; i++) {
      const char = chars[Math.floor(random() * chars.length)]
      tasks.push({
        char,
        code: MORSE_TABLE[char],
        userAnswer: '',
        correct: null
      })
    }
    return tasks
  }

  function loadDailyRecords() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DAILY)
      if (stored) {
        const data = JSON.parse(stored)
        dailyRecords.value = data.records || []
      }
    } catch (e) {
      dailyRecords.value = []
    }
  }

  function saveDailyRecords() {
    try {
      localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify({
        records: dailyRecords.value
      }))
    } catch (e) {
      console.error('Failed to save daily records')
    }
  }

  function calculateStreak(todayStr: string): number {
    const records = dailyRecords.value.filter(r => r.completed)
    if (records.length === 0) return 0

    const sortedDates = [...new Set(records.map(r => r.date))].sort().reverse()
    if (sortedDates.length === 0) return 0

    const today = new Date(todayStr)
    let streak = 0
    let checkDate = new Date(today)

    for (let i = 0; i < 365; i++) {
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
      const hasRecord = records.some(r => r.date === dateStr && r.completed)
      if (hasRecord) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  function initDailyChallenge() {
    loadDailyRecords()
    const todayStr = getTodayString()
    const todayRecord = dailyRecords.value.find(r => r.date === todayStr)

    if (todayRecord && todayRecord.completed) {
      dailyTasks.value = generateDailyTasks(todayStr)
      dailyCompleted.value = true
      dailyCurrentIndex.value = DAILY_TASK_COUNT
    } else {
      dailyTasks.value = generateDailyTasks(todayStr)
      dailyCompleted.value = false
      dailyCurrentIndex.value = 0
    }

    dailyStreak.value = calculateStreak(todayStr)
    dailyUserAnswer.value = ''
  }

  function checkDailyAnswer() {
    if (dailyCompleted.value || dailyCurrentIndex.value >= dailyTasks.value.length) return

    const currentTask = dailyTasks.value[dailyCurrentIndex.value]
    const isCorrect = dailyUserAnswer.value.trim() === currentTask.code
    currentTask.userAnswer = dailyUserAnswer.value.trim()
    currentTask.correct = isCorrect

    if (dailyCurrentIndex.value < dailyTasks.value.length - 1) {
      dailyCurrentIndex.value++
      dailyUserAnswer.value = ''
    } else {
      completeDailyChallenge()
    }
  }

  function completeDailyChallenge() {
    dailyCompleted.value = true
    const todayStr = getTodayString()
    const correctCount = dailyTasks.value.filter(t => t.correct).length

    const todayRecord: DailyChallengeRecord = {
      date: todayStr,
      completed: true,
      correctCount,
      totalCount: dailyTasks.value.length,
      streak: 0
    }

    const existingIndex = dailyRecords.value.findIndex(r => r.date === todayStr)
    if (existingIndex >= 0) {
      dailyRecords.value[existingIndex] = todayRecord
    } else {
      dailyRecords.value.push(todayRecord)
    }

    dailyStreak.value = calculateStreak(todayStr)
    todayRecord.streak = dailyStreak.value

    if (existingIndex >= 0) {
      dailyRecords.value[existingIndex] = todayRecord
    }

    saveDailyRecords()
  }

  function resetDailyChallenge() {
    dailyCurrentIndex.value = 0
    dailyCompleted.value = false
    dailyUserAnswer.value = ''
    dailyTasks.value.forEach(t => {
      t.userAnswer = ''
      t.correct = null
    })
    const todayStr = getTodayString()
    dailyRecords.value = dailyRecords.value.filter(r => r.date !== todayStr)
    dailyStreak.value = calculateStreak(todayStr)
    saveDailyRecords()
  }

  function playCurrentDailyTask() {
    if (dailyTasks.value.length > 0 && dailyCurrentIndex.value < dailyTasks.value.length) {
      playMorse(dailyTasks.value[dailyCurrentIndex.value].code)
    }
  }

  const dailyProgress = computed(() => {
    if (dailyTasks.value.length === 0) return 0
    if (dailyCompleted.value) return 100
    return Math.round((dailyCurrentIndex.value / dailyTasks.value.length) * 100)
  })

  const dailyCorrectCount = computed(() => dailyTasks.value.filter(t => t.correct === true).length)

  const dailyAccuracy = computed(() => {
    const answered = dailyTasks.value.filter(t => t.correct !== null)
    if (answered.length === 0) return 0
    return Math.round((answered.filter(t => t.correct).length / answered.length) * 100)
  })

  return {
    inputText, morseOutput, decodedText, wpm, frequency, volume,
    trainMode, history, quizChar, userAnswer, score, isPlaying,
    dotDuration, encode, decode, playMorse, playTone,
    generateQuiz, checkAnswer, resetScore,
    dailyTasks, dailyCurrentIndex, dailyCompleted, dailyStreak,
    dailyRecords, dailyUserAnswer, dailyProgress, dailyCorrectCount,
    dailyAccuracy,
    initDailyChallenge, checkDailyAnswer, resetDailyChallenge,
    playCurrentDailyTask
  }
})
