<template>
  <div class="detail-page">
    <!-- 顶部 -->
    <div class="detail-header trip-hero-bg">
      <div class="trip-nav">
        <button class="trip-nav-back" @click="$router.push('/trips')">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M12 3L7 9L12 15" stroke="var(--text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="trip-nav-title">{{ trip?.name }}</div>
        <div class="trip-nav-placeholder"></div>
      </div>
      <div class="hero-info">
        <div class="hero-meta">
          <template v-if="trip?.startDate">{{ trip.startDate }}</template>
          <template v-if="trip?.startDate && trip?.endDate"> ~ {{ trip.endDate }}</template>
          <template v-if="!trip?.startDate">创建于 {{ trip?.createdAt ? new Date(trip.createdAt).toLocaleDateString() : '' }}</template>
        </div>
        <div class="hero-stats">
          <span class="hero-stat-badge">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="5" r="3" stroke="var(--primary)" stroke-width="1.5"/>
              <path d="M2 13C2 10.5 4.5 9 7 9C9.5 9 12 10.5 12 13" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ trip?.members.length || 0 }} 人
          </span>
          <span class="hero-stat-badge">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4L7 1L12 4V9C12 11.2 9.8 13 7 13C4.2 13 2 11.2 2 9V4Z" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            共消费 <strong>{{ currencySymbol }}{{ formatMoney(total) }}</strong>
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button class="icon-btn" @click="copyShareLink" title="分享邀请链接">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M10 2L16 8L10 14" stroke="var(--primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 8H16" stroke="var(--primary)" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="icon-btn" @click="$router.push(`/trip/${tripId}/settle`)">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="var(--accent)" stroke-width="1.5"/>
            <path d="M6 9H12" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M9 6V12" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="icon-btn" @click="$router.push(`/trip/${tripId}/spending`)">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="10" width="3" height="5" rx="0.5" stroke="var(--primary)" stroke-width="1.3" fill="var(--primary-light)"/>
            <rect x="7.5" y="6" width="3" height="9" rx="0.5" stroke="var(--primary)" stroke-width="1.3" fill="var(--primary-light)"/>
            <rect x="13" y="3" width="3" height="12" rx="0.5" stroke="var(--primary)" stroke-width="1.3" fill="var(--primary-light)"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 汇率信息 -->
    <div v-if="trip && trip.currency !== 'CNY'" class="rate-bar glass-card">
      <div class="rate-left">
        <span class="rate-flag">{{ currencyInfo.flag }}</span>
        <div class="rate-info">
          <span class="rate-currency">{{ currencyInfo.name }} ({{ trip.currency }})</span>
          <span class="rate-value">{{ rateText }}</span>
        </div>
      </div>
      <span v-if="rateLoading" class="rate-loading">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="spin">
          <circle cx="8" cy="8" r="6" stroke="var(--text-tertiary)" stroke-width="1.5" stroke-dasharray="12 8" stroke-linecap="round"/>
        </svg>
      </span>
    </div>

    <!-- 成员头像行 -->
    <div class="members-row">
      <div
        v-for="member in trip?.members"
        :key="member.id"
        class="member-chip"
        :style="{ borderColor: member.color }"
        @click="startEditMember(member)"
      >
        <span class="chip-avatar" :style="{ background: member.color }">{{ member.name[0] }}</span>
        <span class="chip-name">{{ member.name }}</span>
      </div>
      <button class="member-chip add-member-chip" @click="showAddMember = true">
        <span class="chip-avatar add-avatar" style="background: var(--bg)">+</span>
        <span class="chip-name">加入</span>
      </button>
    </div>

    <!-- 添加成员弹窗 -->
    <Transition name="modal-up">
      <div v-if="showAddMember" class="modal-overlay" @click.self="showAddMember = false">
        <div class="modal">
          <div class="modal-icon-wrap">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="var(--primary-light)"/>
              <path d="M14 26L20 14L26 26" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="20" cy="19" r="2.5" fill="var(--accent)"/>
            </svg>
          </div>
          <div class="modal-title">添加成员</div>
          <div class="form-row">
            <input v-model="newMemberName" class="input modal-input" placeholder="输入昵称" @keyup.enter="doAddMember" />
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="showAddMember = false">取消</button>
            <button class="btn btn-primary" @click="doAddMember">加入</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 编辑成员昵称弹窗 -->
    <Transition name="modal-up">
      <div v-if="editingMember" class="modal-overlay" @click.self="editingMember = null">
        <div class="modal">
          <div class="modal-icon-wrap">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="var(--primary-light)"/>
              <circle cx="20" cy="16" r="5" stroke="var(--primary)" stroke-width="2" fill="none"/>
              <path d="M12 28C12 24 16 22 20 22C24 22 28 24 28 28" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="modal-title">修改昵称</div>
          <div class="form-row">
            <input v-model="editName" class="input modal-input" placeholder="新昵称" @keyup.enter="doRenameMember" />
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="editingMember = null">取消</button>
            <button v-if="!memberHasExpenses(editingMember.id)" class="btn btn-danger" @click="doRemoveMember(editingMember.id)">移除成员</button>
            <button class="btn btn-primary" @click="doRenameMember">保存</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 快捷操作 -->
    <div class="action-row">
      <button class="action-card" @click="$router.push(`/trip/${tripId}/add`)">
        <div class="action-icon-wrap action-icon-write">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13.5 2.5L17.5 6.5L7.5 16.5H3.5V12.5L13.5 2.5Z" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="action-text">记一笔</span>
      </button>
      <button class="action-card" @click="$router.push(`/trip/${tripId}/settle`)">
        <div class="action-icon-wrap action-icon-settle">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M2 5H18V15C18 16.1 17.1 17 16 17H4C2.9 17 2 16.1 2 15V5Z" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 5L10 10L18 5" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="action-text">去结算</span>
      </button>
      <button class="action-card" @click="$router.push(`/trip/${tripId}/spending`)">
        <div class="action-icon-wrap action-icon-chart">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="11" width="4" height="6" rx="1" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.3)"/>
            <rect x="8" y="7" width="4" height="10" rx="1" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.3)"/>
            <rect x="14" y="3" width="4" height="14" rx="1" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.3)"/>
          </svg>
        </div>
        <span class="action-text">消费结构</span>
      </button>
    </div>

    <!-- 消费列表 -->
    <div class="section-title">消费记录</div>

    <div v-if="!trip || trip.expenses.length === 0" class="trip-empty trip-animate-in">
      <div class="trip-empty-icon">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="32" fill="var(--primary-light)" opacity="0.5"/>
          <rect x="20" y="22" width="32" height="28" rx="4" stroke="var(--primary)" stroke-width="2" fill="none"/>
          <path d="M20 30H52" stroke="var(--primary)" stroke-width="1.5"/>
          <circle cx="28" cy="38" r="2" fill="var(--primary)" opacity="0.4"/>
          <circle cx="36" cy="38" r="2" fill="var(--primary)" opacity="0.4"/>
          <circle cx="44" cy="38" r="2" fill="var(--primary)" opacity="0.4"/>
          <path d="M28 44H44" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
        </svg>
      </div>
      <div class="trip-empty-title">还没有消费记录</div>
      <div class="trip-empty-desc">点击右下角按钮开始记账</div>
    </div>

    <div v-for="(group, gIdx) in groupedExpenses" :key="group.date" class="date-group trip-animate-in" :style="{ animationDelay: `${gIdx * 0.06}s` }">
      <div class="date-header">
        <div class="date-label-wrap">
          <div class="date-dot"></div>
          <span class="date-label">{{ formatDateLabel(group.date) }}</span>
        </div>
        <span class="date-total">{{ currencySymbol }}{{ formatMoney(group.dayTotal) }}</span>
      </div>
      <div v-for="expense in group.expenses" :key="expense.id" class="expense-item">
        <div class="expense-top">
          <div class="expense-left">
            <div class="expense-icon">
              {{ getCategoryIcon(expense.categoryId) }}
            </div>
            <div class="expense-info">
              <div class="expense-title">
                {{ expense.note || getCategoryName(expense.categoryId) }}
              </div>
              <div class="expense-meta">
                {{ store.getMemberName(trip!, expense.payerId) }} 付款 · {{ getParticipantsText(expense) }}
              </div>
            </div>
          </div>
          <div class="expense-right">
            <div class="expense-amount">{{ currencySymbol }}{{ formatMoney(expense.amount) }}</div>
            <button class="expense-edit" @click.stop="$router.push(`/trip/${tripId}/add?expenseId=${expense.id}`)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M10 2L12 4L5 11H3V9L10 2Z" stroke="var(--text-secondary)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="expense-delete" @click.stop="confirmDelete(expense.id)">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 3L9 9" stroke="var(--text-tertiary)" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M9 3L3 9" stroke="var(--text-tertiary)" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部快速记账按钮 -->
    <button class="trip-fab fab-add" @click="$router.push(`/trip/${tripId}/add`)">
      <span class="fab-icon">+</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import { fetchRates, getRateText } from '../../utils/exchange-rate'
import { getCurrencyInfo } from '../../types/currencies'

const route = useRoute()
const router = useRouter()
const store = useTripStore()
const tripId = route.params.id as string

const trip = computed(() => store.getTripById(tripId))
const currencyInfo = computed(() => getCurrencyInfo(trip.value?.currency || 'CNY'))
const isForeignCurrency = computed(() => trip.value?.currency !== 'CNY')
const currencySymbol = computed(() => isForeignCurrency.value ? currencyInfo.value.symbol : '¥')
const total = computed(() => trip.value ? store.getTripTotal(trip.value) : 0)

// 分享链接
function copyShareLink() {
  if (!trip.value) return
  const link = store.getShareLink(trip.value)
  navigator.clipboard.writeText(link).then(() => {
    alert('邀请链接已复制！发给朋友即可加入旅行')
  }).catch(() => {
    // fallback
    const input = document.createElement('input')
    input.value = link
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    alert('邀请链接已复制！发给朋友即可加入旅行')
  })
}

// 加入检查：如果直接通过链接进入且未加入过，跳转到加入页
onMounted(async () => {
  if (!store.hasJoined(tripId)) {
    // 尝试从 store 加载旅行数据
    await store.loadTripById(tripId)
    if (!store.hasJoined(tripId) && trip.value?.shareCode) {
      router.replace(`/join/${trip.value.shareCode}`)
      return
    }
  }
})

const sortedExpenses = computed(() => {
  if (!trip.value) return []
  return [...trip.value.expenses].sort((a, b) => {
    // 先按日期倒序，同一天按创建时间倒序
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt - a.createdAt
  })
})

// 按日期分组
const groupedExpenses = computed(() => {
  const groups: { date: string; expenses: typeof sortedExpenses.value; dayTotal: number }[] = []
  let currentDate = ''
  for (const expense of sortedExpenses.value) {
    if (expense.date !== currentDate) {
      currentDate = expense.date
      groups.push({ date: currentDate, expenses: [], dayTotal: 0 })
    }
    groups[groups.length - 1].expenses.push(expense)
    groups[groups.length - 1].dayTotal += expense.amount
  }
  return groups
})

const rateText = ref('')
const rateLoading = ref(true)

onMounted(async () => {
  if (trip.value && trip.value.currency !== 'CNY') {
    rateLoading.value = true
    const data = await fetchRates()
    rateText.value = getRateText(trip.value!.currency, data.rates)
    rateLoading.value = false
  }
})

function getCategoryIcon(id: string) {
  return store.categories.find(c => c.id === id)?.icon || '💰'
}

function getCategoryName(id: string) {
  return store.categories.find(c => c.id === id)?.name || '其他'
}

function getParticipantsText(expense: any): string {
  if (expense.splitMode === 'custom' && expense.splitAmounts) {
    const names = Object.keys(expense.splitAmounts).map(id => store.getMemberName(trip.value!, id))
    return names.join('、') + ' 分摊'
  }
  if (expense.splitAmong.length === 1) {
    return store.getMemberName(trip.value!, expense.splitAmong[0]) + ' 承担'
  }
  const names = expense.splitAmong.map((id: string) => store.getMemberName(trip.value!, id))
  return names.join('、') + ' 均摊'
}

function formatDateLabel(dateStr: string) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${month}月${day}日 周${weekDays[d.getDay()]}`
}

const payMethodMap: Record<string, string> = {
  wechat: '💬 微信',
  alipay: '🔵 支付宝',
  credit_card: '💳 信用卡',
  debit_card: '🏦 储蓄卡',
  cash: '💵 现金',
  transit_card: '🚇 交通卡',
  other: '📱 其他',
}

// 成员管理
const showAddMember = ref(false)
const newMemberName = ref('')
const editingMember = ref<{ id: string; name: string } | null>(null)
const editName = ref('')

async function doAddMember() {
  const name = newMemberName.value.trim()
  if (!name) return
  await store.addMember(tripId, name)
  newMemberName.value = ''
  showAddMember.value = false
}

function startEditMember(member: { id: string; name: string }) {
  editingMember.value = { id: member.id, name: member.name }
  editName.value = member.name
}

async function doRenameMember() {
  if (!editingMember.value) return
  const name = editName.value.trim()
  if (!name) return
  await store.renameMember(tripId, editingMember.value.id, name)
  editingMember.value = null
}

async function doRemoveMember(memberId: string) {
  const ok = await store.removeMember(tripId, memberId)
  if (ok) {
    editingMember.value = null
  } else {
    alert('该成员已有消费记录，无法移除')
  }
}

function memberHasExpenses(memberId: string) {
  if (!trip.value) return false
  return trip.value.expenses.some(e => e.payerId === memberId || e.splitAmong.includes(memberId))
}

function getPayMethodName(code?: string) {
  return payMethodMap[code || ''] || ''
}

function previewImage(src: string) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer'
  overlay.innerHTML = `<img src="${src}" style="max-width:95%;max-height:90%;border-radius:8px" />`
  overlay.onclick = () => overlay.remove()
  document.body.appendChild(overlay)
}

async function confirmDelete(id: string) {
  if (confirm('删除这笔消费？')) {
    await store.removeExpense(tripId, id)
  }
}
</script>

<style scoped>
.detail-page {
  padding: 0 0 40px;
  position: relative;
  min-height: calc(100vh - var(--nav-height));
}

/* ===== 顶部 Hero 区域 ===== */
.detail-header {
  padding: 0 20px 20px;
  position: relative;
}

.detail-header.trip-hero-bg {
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  padding-bottom: 24px;
}

.hero-info {
  padding: 0 4px;
  margin-bottom: 16px;
}

.hero-meta {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin-bottom: 10px;
}

.hero-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hero-stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--card-bg-soft);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 5px 12px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.hero-stat-badge svg {
  flex-shrink: 0;
}

.hero-stat-badge strong {
  color: var(--text);
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: 8px;
  padding: 0 4px;
}

/* 图标按钮 */
.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--card-bg-soft);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: var(--radius);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;
}

.icon-btn:active {
  transform: scale(0.93);
}

/* ===== 汇率信息栏 - 磨砂玻璃 ===== */
.rate-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin: 0 16px 12px;
  border: none;
}

.rate-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rate-flag {
  font-size: 32px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.08));
}

.rate-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rate-currency {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.rate-value {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  display: inline-block;
  width: fit-content;
  font-weight: 500;
}

.rate-loading {
  display: flex;
  align-items: center;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ===== 成员头像行 ===== */
.members-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 16px 4px;
  margin-bottom: 16px;
  scrollbar-width: none;
}

.members-row::-webkit-scrollbar {
  display: none;
}

.member-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 6px;
  background: var(--card-bg);
  border-radius: var(--radius-full);
  border: 2px solid;
  flex-shrink: 0;
  box-shadow: var(--shadow);
  transition: transform 0.15s ease;
  cursor: pointer;
}

.member-chip:active {
  transform: scale(0.96);
}

.chip-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  font-family: var(--font-display);
}

.add-avatar {
  box-shadow: inset 0 0 0 1.5px var(--border);
  color: var(--text-secondary);
  font-size: 16px;
  font-weight: 400;
}

.chip-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  font-family: var(--font-display);
}

.add-member-chip {
  cursor: pointer;
  border-color: var(--border) !important;
  background: var(--card-bg);
  border-style: dashed;
}

/* ===== 弹窗 - TripsView 一致风格 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(30, 42, 58, 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: var(--card-bg);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: 32px 24px 28px;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
}

.modal-icon-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 4px;
  color: var(--text);
}

.modal .form-row {
  margin-bottom: 16px;
}

.modal-input {
  font-family: var(--font-display);
  font-size: 16px;
  padding: 14px 16px;
  border-radius: var(--radius);
  border: 2px solid var(--border-light);
  background: var(--card-bg);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.modal-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(59, 155, 204, 0.1);
  outline: none;
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
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
  transition: transform 0.15s ease;
}

.modal-actions .btn:active {
  transform: scale(0.97);
}

.modal-actions .btn-primary {
  background: var(--primary-gradient);
  box-shadow: 0 4px 12px rgba(59, 155, 204, 0.3);
  border: none;
}

.modal-actions .btn-ghost {
  color: var(--text-secondary);
  font-weight: 600;
  border: none;
  background: transparent;
}

.modal-actions .btn-danger {
  background: var(--expense);
  color: white;
  border: none;
}

/* 弹窗动画 - modal-up */
.modal-up-enter-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.modal-up-leave-active {
  transition: all 0.25s ease-in;
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
  animation: modalSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes modalSlideIn {
  from { transform: translateY(60px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* ===== 快捷操作卡片 ===== */
.action-row {
  display: flex;
  gap: 10px;
  padding: 0 16px;
  margin-bottom: 20px;
}

.action-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 8px 16px;
  background: var(--card-bg);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.action-card:active {
  transform: scale(0.96);
}

/* 卡片顶部渐变装饰条 */
.action-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary-gradient);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.action-card:active::before {
  opacity: 1;
}

.action-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon-write {
  background: var(--primary-gradient);
  box-shadow: 0 3px 10px rgba(59, 155, 204, 0.3);
}

.action-icon-settle {
  background: linear-gradient(135deg, var(--accent) 0%, #F7C948 100%);
  box-shadow: 0 3px 10px rgba(245, 166, 35, 0.3);
}

.action-icon-chart {
  background: linear-gradient(135deg, #4ECDC4 0%, #44B09E 100%);
  box-shadow: 0 3px 10px rgba(78, 205, 196, 0.3);
}

.action-text {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

/* ===== 消费列表 ===== */
.section-title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  padding: 0 16px;
  margin-bottom: 12px;
}

/* 日期分组 */
.date-group {
  margin-bottom: 8px;
  padding: 0 16px;
}

.date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0 10px;
}

.date-label-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-gradient);
  flex-shrink: 0;
}

.date-label {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.date-total {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 700;
  background: var(--bg);
  padding: 3px 10px;
  border-radius: var(--radius-full);
}

/* 消费项 */
.expense-item {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  margin-bottom: 8px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border-light);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.expense-item:active {
  transform: scale(0.985);
}

.expense-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.expense-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.expense-icon {
  font-size: 22px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient-soft);
  border-radius: var(--radius);
  flex-shrink: 0;
  box-shadow: inset 0 1px 3px rgba(59, 155, 204, 0.08);
}

.expense-info {
  flex: 1;
  min-width: 0;
}

.expense-title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expense-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 3px;
}

.expense-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.expense-amount {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  margin-right: 2px;
}

.expense-per {
  font-size: 11px;
  color: var(--text-secondary);
}

.expense-edit {
  width: 30px;
  height: 30px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: var(--radius);
  opacity: 0.5;
  transition: opacity 0.15s ease, background 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expense-edit:hover,
.expense-edit:active {
  opacity: 1;
  background: var(--bg);
}

.expense-delete {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.expense-delete:hover,
.expense-delete:active {
  background: var(--expense-light);
}

.expense-delete:active svg path {
  stroke: var(--expense);
}

/* 自定义分摊明细 */
.expense-split-detail {
  width: 100%;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-light);
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

/* 消费图片 */
.expense-images {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.expense-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--radius);
  cursor: pointer;
  border: 1px solid var(--border-light);
}

.split-detail-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.split-detail-amount {
  font-weight: 600;
  color: var(--text);
}

/* ===== FAB 按钮 ===== */
.fab-add {
  position: fixed;
  bottom: calc(var(--nav-height) + 20px);
  right: 20px;
  width: 56px;
  height: 56px;
  border: none;
  background: var(--primary-gradient);
  color: white;
  border-radius: var(--radius);
  font-size: 28px;
  font-weight: 300;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(59, 155, 204, 0.35);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.fab-add:active {
  transform: scale(0.90);
}

@media (min-width: 480px) {
  .fab-add {
    right: calc(50% - 240px + 20px);
  }
}

.fab-icon {
  font-size: 32px;
  font-weight: 300;
  line-height: 1;
}

/* ===== 空状态 ===== */
.trip-empty {
  padding: 48px 24px;
}

.trip-empty-icon svg {
  filter: saturate(0.85);
}
</style>
