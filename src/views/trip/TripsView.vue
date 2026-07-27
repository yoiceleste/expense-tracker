<template>
  <div class="trips-page trip-page">
    <!-- 顶部手账封面 -->
    <div class="trips-hero trip-hero-bg">
      <!-- 装饰涂鸦 -->
      <svg class="doodle-star" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8Z" fill="var(--accent)" opacity="0.3"/>
      </svg>
      <svg class="doodle-leaf" width="30" height="30" viewBox="0 0 30 30" fill="none">
        <path d="M15 28C15 28 5 20 5 12C5 7 10 3 15 3C20 3 25 7 25 12C25 20 15 28 15 28Z" stroke="var(--primary)" stroke-width="1.5" fill="none" opacity="0.2"/>
        <path d="M15 5V25" stroke="var(--primary)" stroke-width="1" opacity="0.15"/>
      </svg>
      <div class="hero-header">
        <div>
          <h1 class="hero-title">旅行手账</h1>
          <p class="hero-subtitle">记录每一段旅程 ✿</p>
        </div>
        <!-- 手绘风格旅行图标 -->
        <svg class="hero-plane" width="56" height="56" viewBox="0 0 56 56" fill="none">
          <path d="M8 28C8 28 20 22 28 22C36 22 48 28 48 28C48 28 36 34 28 34C20 34 8 28 8 28Z" stroke="var(--primary)" stroke-width="2" fill="rgba(123,160,91,0.1)" stroke-linecap="round"/>
          <path d="M28 16L32 26H24L28 16Z" stroke="var(--accent)" stroke-width="2" fill="rgba(224,120,86,0.1)" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="28" cy="28" r="2.5" fill="var(--accent)" opacity="0.6"/>
          <path d="M8 28L4 24M48 28L52 24" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
        </svg>
      </div>
    </div>

    <!-- 旅行列表 -->
    <div class="trips-content">
      <!-- 空状态 -->
      <div v-if="store.trips.length === 0" class="trip-empty trip-animate-in">
        <div class="trip-empty-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" fill="var(--primary-light)" opacity="0.6"/>
            <path d="M28 48L40 24L52 48" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="40" cy="34" r="3" fill="var(--accent)"/>
            <path d="M24 48H56" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
          </svg>
        </div>
        <div class="trip-empty-title">还没有旅行计划</div>
        <div class="trip-empty-desc">点击下方按钮创建一个旅行<br>轻松管理多人花销</div>
      </div>

      <!-- 旅行卡片 - 手账贴纸风格 -->
      <div
        v-for="(trip, idx) in store.trips"
        :key="trip.id"
        class="trip-card trip-animate-in"
        :class="{ 'tilt-left': idx % 2 === 0, 'tilt-right': idx % 2 === 1 }"
        :style="{ animationDelay: `${idx * 0.08}s` }"
        @click="$router.push(`/trip/${trip.id}`)"
      >
        <!-- 和纸胶带装饰 -->
        <div class="washi-tape washi-tape-green" :class="idx % 2 === 0 ? 'tape-tl' : 'tape-tr'"></div>
        <!-- 卡片装饰渐变条 -->
        <div class="trip-card-accent"></div>
        <div class="trip-card-body">
          <div class="trip-top">
            <div class="trip-info">
              <div class="trip-name">{{ trip.name }}</div>
              <div class="trip-meta">
                <template v-if="trip.startDate">{{ formatDateShort(trip.startDate) }}</template>
                <template v-if="trip.startDate && trip.endDate"> — {{ formatDateShort(trip.endDate) }}</template>
                <template v-if="!trip.startDate">创建于 {{ new Date(trip.createdAt).toLocaleDateString() }}</template>
                <span class="trip-meta-dot">·</span>
                <span>{{ trip.members.length }} 人</span>
                <span class="trip-meta-dot">·</span>
                <span>{{ trip.expenses.length }} 笔</span>
              </div>
            </div>
            <div class="trip-amount-wrap">
              <div class="trip-amount">{{ formatMoney(getTripTotal(trip)) }}</div>
              <div class="trip-currency">{{ getCurrencySymbol(trip.currency) }}</div>
            </div>
          </div>
          <div class="trip-members">
            <div
              v-for="(member, mi) in trip.members.slice(0, 6)"
              :key="member.id"
              class="avatar"
              :style="{ background: member.color, marginLeft: mi === 0 ? '0' : '-6px' }"
            >
              {{ member.name[0] }}
            </div>
            <div v-if="trip.members.length > 6" class="avatar more" :style="{ marginLeft: '-6px' }">
              +{{ trip.members.length - 6 }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置昵称弹窗 -->
      <div v-if="showNickname" class="modal-overlay" @click.self="showNickname = false">
        <div class="modal">
          <div class="modal-icon-wrap">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="var(--primary-light)"/>
              <path d="M12 22L20 14L28 22" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="20" cy="19" r="2.5" fill="var(--accent)"/>
            </svg>
          </div>
          <div class="modal-title">{{ pendingTripName }}</div>
          <div class="nickname-hint">设置你在旅行中的昵称</div>
          <div class="form-row">
            <input
              ref="nicknameInput"
              v-model="creatorNickname"
              class="input nickname-input"
              placeholder="你的昵称"
              maxlength="10"
              @keyup.enter="confirmNickname"
            />
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="showNickname = false">取消</button>
            <button class="btn btn-primary" :disabled="!creatorNickname.trim()" @click="confirmNickname">
              进入旅行
            </button>
          </div>
        </div>
      </div>

    <!-- 新建旅行弹窗 -->
    <button class="fab" style="display:none" @click="showCreate = true">+</button>

      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
        <div class="modal">
          <div class="modal-icon-wrap">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="var(--primary-light)"/>
              <path d="M14 26L20 14L26 26" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="modal-title">新建旅行</div>
          <div class="form-row">
            <input v-model="tripName" class="input" placeholder="旅行名称，如：三亚之旅" />
          </div>
          <div class="form-row">
            <label class="form-label">当地货币</label>
            <select v-model="selectedCurrency" class="input currency-select">
              <option v-for="cur in popularCurrencies" :key="cur.code" :value="cur.code">
                {{ cur.flag }} {{ cur.name }} ({{ cur.code }})
              </option>
            </select>
          </div>
          <div class="form-row date-row">
            <div class="date-field">
              <label class="form-label">开始日期</label>
              <input v-model="startDate" type="date" class="input" />
            </div>
            <div class="date-field">
              <label class="form-label">结束日期</label>
              <input v-model="endDate" type="date" class="input" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="showCreate = false">取消</button>
            <button class="btn btn-primary" @click="createTrip">创建旅行</button>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import { popularCurrencies } from '../../types/currencies'
import type { Trip } from '../../types/trip'

const router = useRouter()
const route = useRoute()
const store = useTripStore()

const showCreate = ref(false)
const showNickname = ref(false)
const pendingTripId = ref('')
const pendingTripName = ref('')
const creatorNickname = ref('')
const nicknameInput = ref<HTMLInputElement | null>(null)
const tripName = ref('')
const selectedCurrency = ref('CNY')
const startDate = ref('')
const endDate = ref('')

function openCreateModal() {
  showCreate.value = true
  if (route.query.create) {
    router.replace({ path: '/trips', query: {} })
  }
}

watch(() => route.query.create, (val) => {
  if (val === '1') openCreateModal()
})

onMounted(() => {
  if (route.query.create === '1') openCreateModal()
})

function getTripTotal(trip: Trip) {
  return trip.expenses.reduce((s, e) => s + e.amount, 0)
}

function getCurrencySymbol(code: string) {
  const info = popularCurrencies.find(c => c.code === code)
  return info ? `${info.flag} ${code}` : code
}

function formatDateShort(date: string) {
  if (!date) return ''
  const d = new Date(date + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

async function createTrip() {
  const name = tripName.value.trim()
  if (!name) { alert('请输入旅行名称'); return }

  const trip = await store.createTrip(name, selectedCurrency.value, startDate.value, endDate.value)
  showCreate.value = false
  tripName.value = ''
  selectedCurrency.value = 'CNY'
  startDate.value = ''
  endDate.value = ''

  pendingTripId.value = trip.id
  pendingTripName.value = trip.name
  creatorNickname.value = ''
  showNickname.value = true

  await nextTick()
  nicknameInput.value?.focus()
}

async function confirmNickname() {
  const name = creatorNickname.value.trim()
  if (!name) return

  await store.joinTrip(pendingTripId.value, name)
  await store.loadTripById(pendingTripId.value)
  showNickname.value = false

  // 等待弹窗关闭后再提示和跳转
  await nextTick()

  const link = store.getShareLink(store.getTripById(pendingTripId.value)!)
  try {
    await navigator.clipboard.writeText(link)
    alert('邀请链接已复制！发给朋友即可加入旅行')
  } catch {
    alert(`邀请链接：\n${link}`)
  }

  router.push(`/trip/${pendingTripId.value}`)
}
</script>

<style scoped>
.trips-page {
  padding: 0;
}

/* ===== Hero 手账封面 ===== */
.trips-hero {
  padding: 36px 20px 40px;
}

.doodle-star {
  position: absolute;
  top: 16px;
  right: 80px;
  z-index: 0;
}

.doodle-leaf {
  position: absolute;
  bottom: 12px;
  right: 24px;
  z-index: 0;
}

.hero-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.hero-title {
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
  line-height: 1.1;
  margin-bottom: 6px;
}

.hero-subtitle {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 400;
  letter-spacing: 0.02em;
}

.hero-plane {
  opacity: 0.7;
  flex-shrink: 0;
}

/* ===== 内容区 ===== */
.trips-content {
  padding: 0 16px;
  margin-top: -8px;
}

/* ===== 旅行卡片 - 手账贴纸风格 ===== */
.trip-card {
  position: relative;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
}

.trip-card:active {
  transform: scale(0.97) rotate(0deg) !important;
  box-shadow: var(--shadow-lg);
}

/* 和纸胶带位置 */
.tape-tl {
  top: -8px;
  left: 20px;
  transform: rotate(-12deg);
}

.tape-tr {
  top: -8px;
  right: 20px;
  transform: rotate(12deg);
}

.trip-card-accent {
  height: 4px;
  background: var(--primary-gradient);
}

.trip-card-body {
  padding: 18px 20px 20px;
}

.trip-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.trip-name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
  letter-spacing: -0.01em;
}

.trip-meta {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 400;
}

.trip-meta-dot {
  margin: 0 4px;
  opacity: 0.5;
}

.trip-amount-wrap {
  text-align: right;
  flex-shrink: 0;
  margin-left: 12px;
}

.trip-amount {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.1;
}

.trip-currency {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ===== 成员头像 ===== */
.trip-members {
  display: flex;
  align-items: center;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: white;
  border: 2.5px solid var(--card-bg);
  box-shadow: 0 1px 3px rgba(92, 74, 58, 0.1);
  transition: transform 0.3s ease;
  font-family: var(--font-display);
}

.avatar.more {
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  border: 2.5px solid var(--card-bg);
}

/* ===== FAB ===== */
.fab {
  display: none;
}

/* ===== 弹窗 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(92, 74, 58, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: var(--card-bg);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: 36px 24px 28px;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 -8px 32px rgba(92, 74, 58, 0.12);
  position: relative;
}

/* 弹窗顶部装饰条 */
.modal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: var(--primary-gradient);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}

.modal-icon-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 4px;
  color: var(--text);
  letter-spacing: -0.01em;
}

.form-row {
  margin-bottom: 18px;
}

.date-row {
  display: flex;
  gap: 10px;
}

.date-field {
  flex: 1;
}

.form-label {
  display: block;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  letter-spacing: 0.02em;
}

/* 货币选择 */
.currency-select {
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23A0927E' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

.modal-actions .btn {
  flex: 1;
  padding: 14px;
  border-radius: var(--radius);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 15px;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-actions .btn:active {
  transform: scale(0.96);
}

.modal-actions .btn-primary {
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 3px 10px rgba(123, 160, 91, 0.25);
  border: none;
}

.modal-actions .btn-ghost {
  color: var(--text-secondary);
  font-weight: 600;
  background: var(--bg);
}

/* 昵称弹窗 */
.nickname-hint {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.nickname-input {
  text-align: center;
  font-family: var(--font-display);
  font-size: 20px;
  padding: 14px;
  font-weight: 600;
  border: 2px solid var(--border);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  border-radius: var(--radius);
}

.nickname-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(123, 160, 91, 0.1);
  outline: none;
}

/* 弹窗动画 */
.modal-up-enter-active {
  transition: all 0.5s ease;
}

.modal-up-leave-active {
  transition: all 0.3s ease-in;
}

.modal-up-enter-from .modal,
.modal-up-leave-to .modal {
  transform: translateY(100%);
  opacity: 0;
}

.modal-up-enter-from,
.modal-up-leave-to {
  opacity: 0;
}

.modal-up-enter-active .modal {
  animation: modalSlideIn 0.5s ease;
}

@keyframes modalSlideIn {
  from { transform: translateY(60px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
