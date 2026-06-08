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

      <div v-if="trip.members.length > 0" class="identity-recovery">
        <div class="section-label">我已经是旅行成员</div>
        <div class="member-options">
          <button
            v-for="member in trip.members"
            :key="member.id"
            class="member-option"
            :class="{ selected: selectedMemberId === member.id }"
            @click="selectedMemberId = member.id"
          >
            <span class="member-dot" :style="{ background: member.color }"></span>
            {{ member.name }}
          </button>
        </div>
        <button
          class="btn btn-primary btn-block"
          :disabled="!selectedMemberId || joining"
          @click="handleRestoreIdentity"
        >
          {{ joining ? '恢复中...' : '恢复已有身份' }}
        </button>
      </div>

      <div v-if="trip.members.length > 0" class="join-divider"><span>或</span></div>

      <div class="section-label">我是新成员</div>
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
import type { Trip } from '../../types/trip'

const route = useRoute()
const router = useRouter()
const store = useTripStore()

const shareCode = route.params.code as string
const trip = ref<Trip | null>(null)
const loading = ref(true)
const error = ref('')
const nickname = ref('')
const nicknameInput = ref<HTMLInputElement | null>(null)
const joining = ref(false)
const selectedMemberId = ref('')
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
  if (store.hasJoined(tripData.id, tripData.members)) {
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


async function handleRestoreIdentity() {
  if (!trip.value || !selectedMemberId.value) return
  joining.value = true
  try {
    if (!store.restoreMemberIdentity(trip.value, selectedMemberId.value)) {
      error.value = '该成员已不存在，请重新选择'
      return
    }
    await store.loadTripById(trip.value.id)
    router.replace(`/trip/${trip.value.id}`)
  } catch {
    error.value = '身份恢复失败，请重试'
  } finally {
    joining.value = false
  }
}

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


.identity-recovery {
  margin-bottom: 20px;
}

.section-label {
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-size: 13px;
}

.member-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.member-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
  padding: 10px 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-primary);
  cursor: pointer;
}

.member-option.selected {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
}

.member-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 50%;
}

.join-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0 18px;
  color: var(--text-secondary);
  font-size: 12px;
}

.join-divider::before,
.join-divider::after {
  content: '';
  height: 1px;
  flex: 1;
  background: var(--border);
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
