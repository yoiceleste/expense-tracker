<template>
  <div class="join-page">
    <div v-if="loading" class="loading-state">
      <div class="loading-icon">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="26" fill="var(--primary-light)" opacity="0.7"/>
          <path d="M16 32L28 18L40 32" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="28" cy="24" r="3" fill="var(--accent)"/>
          <path d="M12 32H44" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
        </svg>
      </div>
      <div>加载中...</div>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="26" fill="var(--expense-light)" opacity="0.7"/>
          <path d="M20 20L36 36" stroke="var(--expense)" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M36 20L20 36" stroke="var(--expense)" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="28" cy="28" r="4" fill="var(--expense)" opacity="0.15"/>
        </svg>
      </div>
      <div class="error-text">{{ error }}</div>
    </div>

    <div v-else-if="trip && !needsJoin" class="redirect-state">
      <div class="redirect-icon">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="26" fill="var(--income-light)" opacity="0.7"/>
          <path d="M18 28L24 34L38 20" stroke="var(--income)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>正在进入 {{ trip.name }}...</div>
    </div>

    <div v-else-if="trip" class="join-card trip-animate-in">
      <div class="join-logo">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" fill="var(--primary-light)" opacity="0.6"/>
          <path d="M8 32C8 32 20 24 32 24C44 24 56 32 56 32C56 32 44 40 32 40C20 40 8 32 8 32Z" fill="rgba(123,160,91,0.25)"/>
          <path d="M32 20L36 28H28L32 20Z" fill="rgba(123,160,91,0.5)"/>
          <circle cx="32" cy="32" r="3" fill="var(--primary)"/>
        </svg>
      </div>
      <h1 class="join-title">{{ trip.name }}</h1>
      <p class="join-meta">
        {{ trip.members.length }} 位成员 · {{ trip.expenses.length }} 笔消费
      </p>

      <div class="form-group">
        <input
          ref="nicknameInput"
          v-model="nickname"
          class="input"
          placeholder="输入你的昵称"
          maxlength="10"
          @keyup.enter="handleJoin"
        />
      </div>

      <button class="btn btn-primary btn-block" :disabled="!nickname.trim() || joining" @click="handleJoin">
        {{ joining ? '加入中...' : '加入旅行' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripStore } from '../../stores/trip'

const route = useRoute()
const router = useRouter()
const store = useTripStore()

const shareCode = route.params.code as string
const trip = ref<any>(null)
const loading = ref(true)
const error = ref('')
const nickname = ref('')
const nicknameInput = ref<HTMLInputElement | null>(null)
const joining = ref(false)
const needsJoin = ref(false)

onMounted(async () => {
  // 1. 通过分享码查找旅行
  const tripData = await store.findByShareCode(shareCode)
  if (!tripData) {
    error.value = '旅行不存在或链接已失效'
    loading.value = false
    return
  }

  trip.value = tripData

  // 2. 检查是否已加入过
  if (store.hasJoined(tripData.id)) {
    // 已加入，直接跳转
    await store.loadTripById(tripData.id)
    router.replace(`/trip/${tripData.id}`)
    return
  }

  // 3. 需要加入，显示昵称输入
  needsJoin.value = true
  loading.value = false

  // 自动聚焦输入框
  await nextTick()
  nicknameInput.value?.focus()
})

async function handleJoin() {
  const name = nickname.value.trim()
  if (!name) return
  joining.value = true
  try {
    await store.joinTrip(trip.value.id, name)
    await store.loadTripById(trip.value.id)
    router.replace(`/trip/${trip.value.id}`)
  } catch {
    error.value = '加入失败，请重试'
  } finally {
    joining.value = false
  }
}
</script>

<style scoped>
.join-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: var(--bg-trip);
}

/* 加入卡片 */
.join-card {
  background: var(--card-bg);
  background-image:
    radial-gradient(circle at 15% 20%, rgba(123, 160, 91, 0.04) 0%, transparent 45%),
    radial-gradient(circle at 85% 80%, rgba(224, 120, 86, 0.04) 0%, transparent 45%),
    repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(92, 74, 58, 0.015) 3px, rgba(92, 74, 58, 0.015) 4px);
  border: 2px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 48px 28px 36px;
  width: 100%;
  max-width: 380px;
  box-shadow: var(--shadow);
  text-align: center;
  position: relative;
  z-index: 1;
}

/* Logo */
.join-logo {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

/* 标题 */
.join-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
  letter-spacing: -0.01em;
  font-style: italic;
}

/* 元信息 */
.join-meta {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 32px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* 表单 */
.form-group {
  margin-bottom: 20px;
}

.form-group .input {
  text-align: center;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  padding: 14px 16px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--card-bg);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  letter-spacing: -0.01em;
}

.form-group .input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(123, 160, 91, 0.1);
  outline: none;
}

.form-group .input::placeholder {
  font-weight: 500;
  color: var(--text-tertiary);
  font-size: 15px;
}

/* 按钮 */
.btn-block {
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font-display);
  border-radius: var(--radius);
  transition: transform 0.5s ease;
}

.btn-block:disabled {
  opacity: 0.5;
  transform: none;
}

.btn-primary.btn-block {
  background: var(--primary-gradient);
  color: #fff;
  border: none;
  box-shadow: 0 3px 10px rgba(123, 160, 91, 0.25);
}

.btn-primary.btn-block:active:not(:disabled) {
  transform: scale(0.98);
}

/* 加载状态 */
.loading-state,
.error-state,
.redirect-state {
  text-align: center;
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

.loading-icon,
.error-icon,
.redirect-icon {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

.loading-icon svg {
  animation: pulse 1.5s ease-in-out infinite;
}

.redirect-icon svg {
  animation: checkBounce 0.5s ease;
}

@keyframes checkBounce {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}

.error-text {
  color: var(--expense);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 15px;
  max-width: 260px;
  margin: 0 auto;
  line-height: 1.5;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
}
</style>
