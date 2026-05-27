<template>
  <div class="detail-page">
    <!-- 顶部 -->
    <div class="detail-header">
      <button class="back-btn" @click="$router.push('/trips')">←</button>
      <div class="header-info">
        <div class="header-title">{{ trip?.name }}</div>
        <div class="header-meta">
          <template v-if="trip?.startDate">{{ trip.startDate }}</template>
          <template v-if="trip?.startDate && trip?.endDate"> ~ {{ trip.endDate }}</template>
          · {{ trip?.members.length || 0 }}人 · 共消费 <strong>¥{{ formatMoney(total) }}</strong>
        </div>
      </div>
      <div class="header-actions">
        <button class="icon-btn" @click="$router.push(`/trip/${tripId}/settle`)">💰</button>
        <button class="icon-btn" @click="$router.push(`/trip/${tripId}/spending`)">📊</button>
      </div>
    </div>

    <!-- 汇率信息 -->
    <div v-if="trip && trip.currency !== 'CNY'" class="rate-bar">
      <div class="rate-left">
        <span class="rate-flag">{{ currencyInfo.flag }}</span>
        <div class="rate-info">
          <span class="rate-currency">{{ currencyInfo.name }} ({{ trip.currency }})</span>
          <span class="rate-value">{{ rateText }}</span>
        </div>
      </div>
      <span v-if="rateLoading" class="rate-loading">⏳</span>
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
        <span class="chip-avatar" style="background: var(--bg)">+</span>
        <span class="chip-name">加入</span>
      </button>
    </div>

    <!-- 添加成员弹窗 -->
    <div v-if="showAddMember" class="modal-overlay" @click.self="showAddMember = false">
      <div class="modal">
        <div class="modal-title">添加成员</div>
        <div class="form-row">
          <input v-model="newMemberName" class="input" placeholder="输入昵称" @keyup.enter="doAddMember" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showAddMember = false">取消</button>
          <button class="btn btn-primary" @click="doAddMember">加入</button>
        </div>
      </div>
    </div>

    <!-- 编辑成员昵称弹窗 -->
    <div v-if="editingMember" class="modal-overlay" @click.self="editingMember = null">
      <div class="modal">
        <div class="modal-title">修改昵称</div>
        <div class="form-row">
          <input v-model="editName" class="input" placeholder="新昵称" @keyup.enter="doRenameMember" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="editingMember = null">取消</button>
          <button v-if="!memberHasExpenses(editingMember.id)" class="btn btn-danger" @click="doRemoveMember(editingMember.id)">移除成员</button>
          <button class="btn btn-primary" @click="doRenameMember">保存</button>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="action-row">
      <button class="action-card" @click="$router.push(`/trip/${tripId}/add`)">
        <span class="action-icon">✏️</span>
        <span class="action-text">记一笔</span>
      </button>
      <button class="action-card" @click="$router.push(`/trip/${tripId}/settle`)">
        <span class="action-icon">🔄</span>
        <span class="action-text">去结算</span>
      </button>
      <button class="action-card" @click="$router.push(`/trip/${tripId}/spending`)">
        <span class="action-icon">📋</span>
        <span class="action-text">消费结构</span>
      </button>
    </div>

    <!-- 消费列表 -->
    <div class="section-title">消费记录</div>

    <div v-if="!trip || trip.expenses.length === 0" class="empty-state">
      <div class="icon">📝</div>
      <div class="text">还没有消费记录</div>
    </div>

    <div v-for="group in groupedExpenses" :key="group.date" class="date-group">
      <div class="date-header">
        <span class="date-label">{{ formatDateLabel(group.date) }}</span>
        <span class="date-total">¥{{ formatMoney(group.dayTotal) }}</span>
      </div>
      <div v-for="expense in group.expenses" :key="expense.id" class="expense-item">
        <div class="expense-top">
          <div class="expense-left">
            <span class="expense-icon">{{ getCategoryIcon(expense.categoryId) }}</span>
            <div class="expense-info">
              <div class="expense-title">
                {{ expense.note || getCategoryName(expense.categoryId) }}
              </div>
              <div class="expense-meta">
                {{ store.getMemberName(trip!, expense.payerId) }} 付款
                · {{ expense.splitMode === 'custom' ? '自定义' : '均摊' }}
                · {{ getPayMethodName(expense.payMethod) }}
              </div>
            </div>
          </div>
          <div class="expense-right">
            <div class="expense-amount">¥{{ formatMoney(expense.amount) }}</div>
            <div class="expense-per">
              <template v-if="expense.splitMode === 'custom' && expense.splitAmounts">
                {{ formatMoney(Object.values(expense.splitAmounts).reduce((s, a) => s + a, 0)) }}/人
              </template>
              <template v-else>
                ¥{{ formatMoney(expense.amount / expense.splitAmong.length) }}/人
              </template>
            </div>
            <button class="expense-edit" @click.stop="$router.push(`/trip/${tripId}/add?expenseId=${expense.id}`)">✏️</button>
            <button class="expense-delete" @click.stop="confirmDelete(expense.id)">×</button>
          </div>
        </div>
        <!-- 自定义金额明细 -->
        <div v-if="expense.splitMode === 'custom' && expense.splitAmounts" class="expense-split-detail">
          <div
            v-for="(amount, memberId) in expense.splitAmounts"
            :key="memberId"
            class="split-detail-row"
          >
            <span class="split-detail-name">{{ store.getMemberName(trip!, memberId as string) }}</span>
            <span class="split-detail-amount">¥{{ formatMoney(amount) }}</span>
          </div>
        </div>
        <!-- 图片 -->
        <div v-if="expense.images && expense.images.length > 0" class="expense-images">
          <img
            v-for="(img, idx) in expense.images"
            :key="idx"
            :src="img"
            class="expense-thumb"
            @click="previewImage(img)"
          />
        </div>
      </div>
    </div>

    <!-- 底部快速记账按钮 -->
    <button class="fab-add" @click="$router.push(`/trip/${tripId}/add`)">
      <span class="fab-icon">+</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import { fetchRates, getRateText } from '../../utils/exchange-rate'
import { getCurrencyInfo } from '../../types/currencies'

const route = useRoute()
const store = useTripStore()
const tripId = route.params.id as string

const trip = computed(() => store.getTripById(tripId))
const total = computed(() => trip.value ? store.getTripTotal(trip.value) : 0)
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

const currencyInfo = computed(() => getCurrencyInfo(trip.value?.currency || 'CNY'))

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
  padding: 0 16px 40px;
  position: relative;
  min-height: calc(100vh - var(--nav-height));
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.back-btn {
  width: 34px;
  height: 34px;
  border: none;
  background: var(--card-bg);
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
}

.header-meta {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.header-meta strong {
  color: var(--text);
}

.header-actions {
  display: flex;
  gap: 6px;
}

/* 汇率栏 */
.rate-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.rate-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rate-flag {
  font-size: 32px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
}

.rate-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.rate-currency {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.rate-value {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg);
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-block;
  width: fit-content;
}

.rate-loading {
  font-size: 16px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--card-bg);
  border-radius: 10px;
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

/* 成员行 */
.members-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 16px;
}

.member-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 6px;
  background: var(--card-bg);
  border-radius: 20px;
  border: 1.5px solid;
  flex-shrink: 0;
}

.chip-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.chip-name {
  font-size: 13px;
  font-weight: 500;
}

.add-member-chip {
  cursor: pointer;
  border-color: var(--border) !important;
  background: var(--card-bg);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: var(--card-bg);
  border-radius: 20px 20px 0 0;
  padding: 28px 20px;
  width: 100%;
  max-width: 480px;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 20px;
}

.modal .form-row {
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.modal-actions .btn {
  flex: 1;
  padding: 12px;
}

/* 快捷操作 */
.action-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.action-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  background: var(--card-bg);
  border: none;
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  transition: transform 0.15s;
}

.action-card:active {
  transform: scale(0.96);
}

.action-icon {
  font-size: 24px;
}

.action-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* 消费列表 */
.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

/* 日期分组 */
.date-group {
  margin-bottom: 12px;
}

.date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0 8px;
}

.date-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.date-total {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.expense-item {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: 1px solid var(--border);
  transition: transform 0.15s;
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
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  border-radius: 10px;
  flex-shrink: 0;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
}

.expense-title {
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expense-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.expense-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.expense-amount {
  font-size: 15px;
  font-weight: 600;
}

.expense-per {
  font-size: 11px;
  color: var(--text-secondary);
}

.expense-edit {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  font-size: 14px;
  cursor: pointer;
  border-radius: 50%;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.expense-edit:hover {
  opacity: 1;
}

.expense-delete {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #ccc;
  font-size: 18px;
  cursor: pointer;
  border-radius: 50%;
}

.expense-delete:hover {
  color: var(--expense);
}

/* 自定义分摊明细 */
.expense-split-detail {
  width: 100%;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #eee;
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
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid var(--border);
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

/* 底部快速记账 FAB */
.fab-add {
  position: fixed;
  bottom: calc(var(--nav-height) + 20px);
  right: 20px;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  box-shadow: 0 6px 20px rgba(79, 110, 247, 0.45);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
  z-index: 100;
}

.fab-add:active {
  transform: scale(0.92);
  box-shadow: 0 2px 8px rgba(79, 110, 247, 0.3);
}

.fab-icon {
  font-size: 32px;
  font-weight: 300;
  line-height: 1;
}
</style>
