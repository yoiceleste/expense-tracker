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

    <div v-else-if="trip && !needsIdentity" class="redirect-state">
      <div class="redirect-icon">✅</div>
      <div>正在进入 {{ trip.name }}...</div>
    </div>

    <div v-else-if="trip" class="join-card">
      <div class="join-logo">✈️</div>
      <h1 class="join-title">{{ trip.name }}</h1>
      <p class="join-meta">{{ trip.members.length }} 位成员 · {{ trip.expenses.length }} 笔消费</p>

      <template v-if="trip.members.length > 0 && !showCreateForm">
        <h2 class="identity-title">选择你的身份</h2>
        <p class="identity-hint">本地身份记录已丢失，请从旅行现有成员中选择你自己。</p>
        <div class="identity-list">
          <button
            v-for="member in trip.members"
            :key="member.id"
            class="identity-option"
            :disabled="joining"
            @click="selectIdentity(member.id)"
          >
            <span class="identity-avatar" :style="{ background: member.color }">{{ member.name[0] }}</span>
            <span>{{ member.name }}</span>
          </button>
        </div>
        <button class="create-link" :disabled="joining" @click="showCreateForm = true">
          我不是以上成员，创建新身份
        </button>
      </template>

      <template v-else>
        <h2 class="identity-title">{{ trip.members.length ? '创建新身份' : '创建你的身份' }}</h2>
        <p v-if="trip.members.length" class="identity-hint">请确认你不是已有成员，避免创建重复身份。</p>
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
        <div class="create-actions">
          <button v-if="trip.members.length" class="btn btn-ghost" :disabled="joining" @click="showCreateForm = false">返回选择</button>
          <button class="btn btn-primary" :disabled="!nickname.trim() || joining" @click="handleJoin">
            {{ joining ? '创建中...' : '创建并进入' }}
          </button>
        </div>
      </template>
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
const needsIdentity = ref(false)
const showCreateForm = ref(false)

onMounted(async () => {
  const foundTrip = await store.findByShareCode(shareCode)
  if (!foundTrip) {
    error.value = '旅行不存在或链接已失效'
    loading.value = false
    return
  }

  // 先把云端旅行及其 members 加载进 store，再验证本地 memberId 是否仍真实存在。
  trip.value = await store.loadTripById(foundTrip.id) || foundTrip
  if (store.hasJoined(foundTrip.id)) {
    router.replace(`/trip/${foundTrip.id}`)
    return
  }

  needsIdentity.value = true
  showCreateForm.value = trip.value.members.length === 0
  loading.value = false
  if (showCreateForm.value) await focusNickname()
})

async function focusNickname() {
  await nextTick()
  nicknameInput.value?.focus()
}

async function selectIdentity(memberId: string) {
  if (!trip.value || joining.value) return
  joining.value = true
  if (!store.bindMemberIdentity(trip.value.id, memberId)) {
    error.value = '该成员已不存在，请刷新后重试'
    joining.value = false
    return
  }
  router.replace(`/trip/${trip.value.id}`)
}

async function handleJoin() {
  const name = nickname.value.trim()
  if (!name || !trip.value) return
  joining.value = true
  try {
    const member = await store.joinTrip(trip.value.id, name)
    if (!member) throw new Error('create member failed')
    await store.loadTripById(trip.value.id)
    router.replace(`/trip/${trip.value.id}`)
  } catch {
    error.value = '创建身份失败，请重试'
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
  padding: 32px 24px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.join-logo { font-size: 56px; margin-bottom: 8px; }
.join-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
.join-meta { font-size: 13px; color: var(--text-secondary); margin-bottom: 24px; }
.identity-title { font-size: 18px; margin-bottom: 6px; }
.identity-hint { font-size: 13px; line-height: 1.5; color: var(--text-secondary); margin-bottom: 16px; }

.identity-list { display: flex; flex-direction: column; gap: 10px; }
.identity-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  color: var(--text);
  font-size: 15px;
  cursor: pointer;
}
.identity-option:active { background: var(--primary-light); }
.identity-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
}
.create-link {
  margin-top: 18px;
  border: none;
  background: transparent;
  color: var(--primary);
  font-size: 13px;
  cursor: pointer;
}
.form-group { margin-bottom: 16px; }
.form-group .input { text-align: center; font-size: 16px; padding: 14px; }
.create-actions { display: flex; justify-content: flex-end; gap: 10px; }
.loading-state, .error-state, .redirect-state { text-align: center; color: var(--text-secondary); font-size: 15px; }
.loading-icon, .error-icon, .redirect-icon { font-size: 48px; margin-bottom: 12px; }
.error-text { color: var(--expense); }
button:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
