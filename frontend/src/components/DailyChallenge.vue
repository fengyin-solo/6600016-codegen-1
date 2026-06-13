<template>
  <div class="flex flex-col gap-4">
    <!-- Header: Streak & Date -->
    <div class="bg-gray-900 rounded-xl p-4 flex justify-between items-center">
      <div>
        <h3 class="text-amber-300 font-bold text-lg">每日闯关</h3>
        <p class="text-gray-400 text-sm">{{ todayStr }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-3xl">🔥</span>
        <div class="text-right">
          <div class="text-2xl font-bold text-orange-400">{{ store.dailyStreak }}</div>
          <div class="text-xs text-gray-400">连胜天数</div>
        </div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="bg-gray-900 rounded-xl p-4">
      <div class="flex justify-between text-sm mb-2">
        <span class="text-gray-400">今日进度</span>
        <span class="text-amber-400 font-medium">
          {{ store.dailyCompleted ? store.dailyTasks.length : store.dailyCurrentIndex }} / {{ store.dailyTasks.length }}
        </span>
      </div>
      <div class="w-full bg-gray-700 rounded-full h-3">
        <div class="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-300"
          :style="{ width: store.dailyProgress + '%' }"></div>
      </div>
    </div>

    <!-- Challenge Area -->
    <div v-if="!store.dailyCompleted" class="bg-gray-900 rounded-xl p-6">
      <div class="flex flex-col items-center gap-6">
        <div class="text-gray-400 text-sm">第 {{ store.dailyCurrentIndex + 1 }} 题</div>
        
        <div class="text-8xl font-bold text-amber-400">
          {{ currentTask?.char }}
        </div>

        <button @click="store.playCurrentDailyTask()" :disabled="store.isPlaying"
          class="bg-green-600 px-6 py-3 rounded-lg hover:bg-green-500 disabled:opacity-50 text-lg">
          {{ store.isPlaying ? '播放中...' : '🔊 播放音频' }}
        </button>

        <div class="w-full max-w-md">
          <input v-model="store.dailyUserAnswer" @keyup.enter="store.checkDailyAnswer()"
            class="w-full bg-gray-800 rounded-lg px-4 py-3 text-center text-2xl font-mono text-green-400"
            placeholder="输入莫尔斯码 (例如: .-)" autofocus />
        </div>

        <button @click="store.checkDailyAnswer()"
          class="bg-amber-500 text-black px-8 py-3 rounded-lg hover:bg-amber-400 font-bold text-lg">
          确认答案
        </button>

        <!-- Quick input buttons for dots and dashes -->
        <div class="flex gap-3">
          <button @click="addSymbol('.')"
            class="w-16 h-16 bg-gray-700 rounded-full text-3xl font-bold text-green-400 hover:bg-gray-600">
            ·
          </button>
          <button @click="addSymbol('-')"
            class="w-16 h-16 bg-gray-700 rounded-full text-3xl font-bold text-green-400 hover:bg-gray-600">
            —
          </button>
          <button @click="removeSymbol()"
            class="w-16 h-16 bg-gray-700 rounded-full text-xl font-bold text-red-400 hover:bg-gray-600">
            ⌫
          </button>
        </div>
      </div>
    </div>

    <!-- Completed Summary -->
    <div v-else class="bg-gray-900 rounded-xl p-6">
      <div class="text-center">
        <div class="text-6xl mb-4">🎉</div>
        <h3 class="text-2xl font-bold text-amber-400 mb-2">恭喜完成今日闯关！</h3>
        <p class="text-gray-400 mb-6">保持连胜，继续加油！</p>

        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-gray-800 rounded-xl p-4">
            <div class="text-3xl font-bold text-green-400">{{ store.dailyCorrectCount }}</div>
            <div class="text-sm text-gray-400">正确题数</div>
          </div>
          <div class="bg-gray-800 rounded-xl p-4">
            <div class="text-3xl font-bold text-amber-400">{{ store.dailyAccuracy }}%</div>
            <div class="text-sm text-gray-400">正确率</div>
          </div>
          <div class="bg-gray-800 rounded-xl p-4">
            <div class="text-3xl font-bold text-orange-400">{{ store.dailyStreak }}</div>
            <div class="text-sm text-gray-400">连胜天数</div>
          </div>
        </div>

        <!-- Task Review -->
        <div class="text-left">
          <h4 class="text-amber-300 font-bold mb-3">答题详情</h4>
          <div class="max-h-64 overflow-y-auto space-y-2">
            <div v-for="(task, index) in store.dailyTasks" :key="index"
              class="flex justify-between items-center bg-gray-800 rounded-lg px-4 py-2"
              :class="task.correct ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'">
              <div class="flex items-center gap-3">
                <span class="text-gray-400 text-sm w-6">{{ index + 1 }}.</span>
                <span class="text-xl font-bold text-amber-400 w-8">{{ task.char }}</span>
                <span class="font-mono text-green-400">{{ task.code }}</span>
              </div>
              <div class="text-right">
                <div class="font-mono text-sm" :class="task.correct ? 'text-green-400' : 'text-red-400'">
                  {{ task.userAnswer || '-' }}
                </div>
                <div class="text-xs" :class="task.correct ? 'text-green-500' : 'text-red-500'">
                  {{ task.correct ? '✓ 正确' : '✗ 错误' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button @click="store.resetDailyChallenge()"
          class="mt-6 bg-gray-700 text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-600 text-sm">
          重新挑战
        </button>
      </div>
    </div>

    <!-- Recent Records -->
    <div class="bg-gray-900 rounded-xl p-4">
      <h3 class="text-amber-300 font-bold mb-3">最近记录</h3>
      <div v-if="recentRecords.length === 0" class="text-gray-500 text-center py-4">
        暂无记录，开始你的第一次每日闯关吧！
      </div>
      <div v-else class="space-y-2">
        <div v-for="record in recentRecords" :key="record.date"
          class="flex justify-between items-center bg-gray-800 rounded-lg px-3 py-2">
          <div class="flex items-center gap-2">
            <span class="text-gray-400 text-sm">{{ record.date }}</span>
            <span v-if="record.completed" class="text-green-400 text-xs">✓ 已完成</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-amber-400 text-sm">{{ record.correctCount }}/{{ record.totalCount }}</span>
            <span class="text-orange-400 text-sm">🔥 {{ record.streak }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMorseStore } from '../store/morse'

const store = useMorseStore()

const todayStr = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
})

const currentTask = computed(() => {
  if (store.dailyTasks.length === 0 || store.dailyCurrentIndex >= store.dailyTasks.length) {
    return null
  }
  return store.dailyTasks[store.dailyCurrentIndex]
})

const recentRecords = computed(() => {
  return [...store.dailyRecords]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
})

function addSymbol(symbol: string) {
  store.dailyUserAnswer += symbol
}

function removeSymbol() {
  store.dailyUserAnswer = store.dailyUserAnswer.slice(0, -1)
}

onMounted(() => {
  store.initDailyChallenge()
})
</script>
