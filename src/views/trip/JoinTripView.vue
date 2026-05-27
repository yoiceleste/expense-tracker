<template>
  <div class="join-page">
    <div v-if="loading" class="loading-state">
      <div class="loading-icon">✈️</div>
      <div>加载中...</div>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">😔</div>
      <div class="error-text">{{ error }}</div>
    </div>

    <div v-else-if="trip && !needsJoin" class="redirect-state">
      <div class="redirect-icon">✅</div>
      <div>正在进入 {{ trip.name }}...</div>
    </div>

    <div v-else-if="trip" class="join-card">
      <div class="join-logo">✈️</div>
      <h1 class="join-title">{{ trip.name }}</h1>
      <p class="join-meta">
        {{ trip.members.length }} 位成员 · {{ trip.expenses.length }} 笔消费
      </p>

      <div class="form-group">
        <input
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
import { ref, onMounted } from 'vue'
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
const joining = ref(false)
const needsJoin = ref(false)

onMounted(async () => {
  // 先检查是否已加入过
  const existingTrip = await store.joinByShareCode(shareCode, '')
  if (existingTrip && store.hasJoined(existingTrip.id)) {
    // 已加入过，直接跳转
    router.replace(`/trip/${existingTrip.id}`)
    return
  }

  // 加载旅行信息供展示
  const tripData = await store.joinByShareCode(shareCode, '')
  if (!tripData) {
    error.value = '旅行不存在或链接已失效'
    loading.value = false
    return
  }

  trip.value = tripData
  needsJoin.value = true
  loading.value = false
})

async function handleJoin() {
  const name = nickname.value.trim()
  if (!name) return
  joining.value = true
  try {
    const result = await store.joinByShareCode(shareCode, name)
    if (result) {
      router.replace(`/trip/${result.id}`)
    } else {
      error.value = '加入失败，请重试'
    }
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
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg);
}

.join-card {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 40px 28px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.join-logo {
  font-size: 56px;
  margin-bottom: 8px;
}

.join-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 4px;
}

.join-meta {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group .input {
  text-align: center;
  font-size: 16px;
  padding: 14px;
}

.btn-block {
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
}

.btn-block:disabled {
  opacity: 0.6;
}

.loading-state,
.error-state,
.redirect-state {
  text-align: center;
  color: var(--text-secondary);
  font-size: 15px;
}

.loading-icon,
.error-icon,
.redirect-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.error-text {
  color: var(--expense);
}
</style>
