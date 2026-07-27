<template>
  <div class="add-expense-page trip-animate-in">
    <div class="trip-nav">
      <button class="trip-nav-back" @click="$router.back()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="trip-nav-title">{{ isEditing ? '编辑消费' : '记一笔' }}</span>
      <span class="trip-nav-placeholder"></span>
    </div>

    <!-- 草稿恢复提示 -->
    <div v-if="showDraftTip" class="draft-toast">
      <svg class="draft-toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5A623" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <span class="draft-toast-text">已恢复上次未完成的账单</span>
      <button class="draft-discard" @click="discardDraft">丢弃</button>
    </div>

    <!-- 金额 -->
    <div class="amount-card">
      <!-- 外币旅行：只显示外币金额输入框（大字号） -->
      <div v-if="isForeignCurrency" class="foreign-amount-row">
        <span class="foreign-symbol">{{ currencyInfo.symbol }}</span>
        <input
          v-model="amountStr"
          type="text"
          class="foreign-input"
          :placeholder="currencyInfo.code"
          inputmode="decimal"
        />
        <span class="foreign-code">{{ trip?.currency }}</span>
      </div>
      <!-- 人民币旅行：只显示人民币金额输入框 -->
      <div v-else class="cny-amount-row">
        <span class="currency">¥</span>
        <input
          v-model="amountStr"
          type="text"
          class="amount-input"
          placeholder="0.00"
          inputmode="decimal"
        />
        <span class="cny-label">CNY</span>
      </div>
      <div v-if="isForeignCurrency && rateText" class="rate-hint">
        {{ rateText }}
      </div>
      <!-- 外币旅行时，显示人民币等值（只读） -->
      <div v-if="isForeignCurrency && amountNum > 0 && cnyEquivalent > 0" class="rate-hint">
        ≈ ¥{{ formatMoney(cnyEquivalent) }} CNY
      </div>
    </div>

    <!-- 付款人 -->
    <div class="card">
      <div class="card-label">谁付的款</div>
      <div class="picker-row">
        <div
          v-for="member in trip?.members"
          :key="member.id"
          class="picker-chip"
          :class="{ active: payerId === member.id }"
          :style="payerId === member.id ? { background: member.color, borderColor: member.color } : {}"
          @click="payerId = member.id"
        >
          <span class="chip-dot" :style="{ background: member.color }"></span>
          {{ member.name }}
        </div>
      </div>
    </div>

    <!-- 谁参与分摊 -->
    <div class="card">
      <div class="card-label">
        谁参与分摊
        <button class="toggle-all" @click="toggleAll">
          {{ isAllSelected ? '取消全选' : '全选' }}
        </button>
      </div>
      <div class="picker-row">
        <div
          v-for="member in trip?.members"
          :key="member.id"
          class="picker-chip"
          :class="{ active: splitAmong.includes(member.id) }"
          :style="splitAmong.includes(member.id) ? { background: member.color, borderColor: member.color } : {}"
          @click="toggleSplit(member.id)"
        >
          <span class="chip-dot" :style="{ background: member.color }"></span>
          {{ member.name }}
        </div>
      </div>

      <!-- 未选择分摊人提示 -->
      <div v-if="splitAmong.length === 0" class="split-hint split-hint-warning" style="background: #FFF5EB; color: #E67E22;">
        请选择参与分摊的成员
      </div>

      <!-- 分摊方式切换 -->
      <div v-if="splitAmong.length > 1" class="mode-switch">
        <button
          class="mode-btn"
          :class="{ active: splitMode === 'equal' }"
          @click="splitMode = 'equal'"
        >
          均摊
        </button>
        <button
          class="mode-btn"
          :class="{ active: splitMode === 'custom' }"
          @click="splitMode = 'custom'"
        >
          自定义金额
        </button>
      </div>

      <!-- 均摊提示 -->
      <div v-if="splitMode === 'equal' && splitAmong.length > 0 && amountNum > 0" class="split-hint">
        每人 {{ currencySymbol }}{{ formatMoney(amountNum / splitAmong.length) }}
      </div>

      <!-- 自定义金额输入 -->
      <div v-if="splitMode === 'custom'" class="custom-amounts">
        <div
          v-for="memberId in splitAmong"
          :key="memberId"
          class="custom-row"
        >
          <span class="custom-name">
            <span class="custom-dot" :style="{ background: getMemberColor(memberId) }"></span>
            {{ getMemberName(memberId) }}
          </span>
          <div class="custom-input-wrap">
            <span class="custom-currency">{{ currencySymbol }}</span>
            <input
              v-model="customAmounts[memberId]"
              type="text"
              class="custom-input"
              placeholder="0"
              inputmode="decimal"
            />
          </div>
        </div>
        <div class="custom-summary">
          <span>合计</span>
          <span :class="{ over: customTotal > amountNum + 0.01, under: customTotal < amountNum - 0.01 }">
            {{ currencySymbol }}{{ formatMoney(customTotal) }}
          </span>
        </div>
        <div v-if="Math.abs(customTotal - amountNum) > 0.01 && amountNum > 0" class="custom-warning">
          {{ customTotal > amountNum ? '⚠️ 自定义金额合计超出付款金额' : '⚠️ 自定义金额合计不足付款金额' }}
        </div>
      </div>
    </div>

    <!-- 分类 -->
    <div class="card">
      <div class="card-label">分类</div>
      <div class="category-grid">
        <div
          v-for="cat in store.categories"
          :key="cat.id"
          class="cat-item"
          :class="{ active: categoryId === cat.id }"
          @click="categoryId = cat.id"
        >
          <span class="cat-icon">{{ cat.icon }}</span>
          <span class="cat-name">{{ cat.name }}</span>
        </div>
      </div>
    </div>

    <!-- 支付方式 -->
    <div class="card">
      <div class="form-label">支付方式</div>
      <div class="pay-method-grid">
        <div
          v-for="pm in payMethods"
          :key="pm.code"
          class="pm-chip"
          :class="{ active: payMethod === pm.code }"
          @click="payMethod = pm.code"
        >
          <span>{{ pm.icon }}</span>
          <span>{{ pm.name }}</span>
        </div>
      </div>
    </div>

    <!-- 图片上传 -->
    <div class="card">
      <div class="form-label">拍照/图片</div>
      <div class="image-grid">
        <div v-for="(img, idx) in images" :key="idx" class="image-item">
          <img :src="img" class="image-preview" @click="previewImage(idx)" />
          <button class="image-remove" @click="images.splice(idx, 1)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <label v-if="images.length < 9" class="image-add">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            class="image-input"
            @change="onImageSelect"
          />
          <svg class="image-add-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span class="image-add-text">{{ images.length }}/9</span>
        </label>
      </div>
    </div>

    <!-- 备注 + 日期 -->
    <div class="card">
      <div class="form-row">
        <input v-model="note" class="input" placeholder="备注（可选）" />
      </div>
      <div class="form-row">
        <label class="form-label">消费日期</label>
        <input v-model="date" type="date" class="input" />
      </div>
    </div>

    <button class="btn btn-primary btn-block save-btn" @click="save">{{ isEditing ? '保存修改' : '保存' }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import { fetchRates, convertToCNY, getRateText } from '../../utils/exchange-rate'
import { getCurrencyInfo } from '../../types/currencies'
import type { TripExpense } from '../../types/trip'

const route = useRoute()
const router = useRouter()
const store = useTripStore()
const tripId = route.params.id as string
const editingExpenseId = (route.query.expenseId as string) || ''
const isEditing = computed(() => !!editingExpenseId)

const trip = computed(() => store.getTripById(tripId))
const currencyInfo = computed(() => getCurrencyInfo(trip.value?.currency || 'CNY'))
const isForeignCurrency = computed(() => trip.value?.currency !== 'CNY')
const currencySymbol = computed(() => isForeignCurrency.value ? currencyInfo.value.symbol : '¥')

// === 金额状态 ===
// amountStr: 始终存储原始币种金额（外币旅行存外币，人民币旅行存人民币）
const amountStr = ref('')

const payerId = ref('')
const splitAmong = ref<string[]>([])
const splitMode = ref<'equal' | 'custom'>('equal')
const customAmounts = reactive<Record<string, string>>({})
const categoryId = ref(store.categories[0]?.id || '')
const payMethod = ref('wechat')
const images = ref<string[]>([])
const note = ref('')
const date = ref(new Date().toISOString().split('T')[0])
const showDraftTip = ref(false)

// ===== 草稿自动保存 =====
const DRAFT_KEY = `trip_expense_draft_${tripId}`

function saveDraft() {
  if (!amountStr.value && !note.value) return
  const draft = {
    amountStr: amountStr.value,
    payerId: payerId.value,
    splitAmong: splitAmong.value,
    splitMode: splitMode.value,
    customAmounts: { ...customAmounts },
    categoryId: categoryId.value,
    payMethod: payMethod.value,
    note: note.value,
    date: date.value,
  }
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch { /* ignore */ }
}

function loadDraft(): boolean {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return false
    const draft = JSON.parse(raw)
    if (!draft.amountStr && !draft.note) return false
    amountStr.value = draft.amountStr || ''
    payerId.value = draft.payerId || ''
    splitAmong.value = draft.splitAmong || []
    splitMode.value = draft.splitMode || 'equal'
    categoryId.value = draft.categoryId || store.categories[0]?.id || ''
    payMethod.value = draft.payMethod || 'wechat'
    note.value = draft.note || ''
    date.value = draft.date || new Date().toISOString().split('T')[0]
    if (draft.customAmounts) {
      Object.assign(customAmounts, draft.customAmounts)
    }
    return true
  } catch {
    return false
  }
}

function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
}

function restoreDraft() {
  if (loadDraft()) {
    showDraftTip.value = true
    setTimeout(() => { showDraftTip.value = false }, 3000)
  }
}

function discardDraft() {
  clearDraft()
  showDraftTip.value = false
  resetForm()
}

function resetForm() {
  amountStr.value = ''
  payerId.value = trip.value?.members[0]?.id || ''
  splitAmong.value = []
  splitMode.value = 'equal'
  Object.keys(customAmounts).forEach(k => delete customAmounts[k])
  categoryId.value = store.categories[0]?.id || ''
  payMethod.value = 'wechat'
  note.value = ''
  date.value = new Date().toISOString().split('T')[0]
}

// 监听表单变化，自动保存草稿（防抖）
let draftTimer: ReturnType<typeof setTimeout> | null = null
function scheduleDraftSave() {
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(saveDraft, 500)
}

watch([amountStr, payerId, splitAmong, splitMode, categoryId, payMethod, note, date], () => {
  scheduleDraftSave()
}, { deep: true })

const amountNum = computed(() => parseFloat(amountStr.value) || 0)

const payMethods = [
  { code: 'wechat', name: '微信', icon: '💬' },
  { code: 'alipay', name: '支付宝', icon: '🔵' },
  { code: 'credit_card', name: '信用卡', icon: '💳' },
  { code: 'debit_card', name: '储蓄卡', icon: '🏦' },
  { code: 'cash', name: '现金', icon: '💵' },
  { code: 'transit_card', name: '交通卡', icon: '🚇' },
  { code: 'other', name: '其他', icon: '📱' },
]

const customTotal = computed(() => {
  return splitAmong.value.reduce((s, id) => s + (parseFloat(customAmounts[id]) || 0), 0)
})

const isAllSelected = computed(() =>
  trip.value ? splitAmong.value.length === trip.value.members.length : false
)

// 汇率相关
const rateText = ref('')
let exchangeRates: Record<string, number> = {}

// 外币旅行时的人民币等值（只读显示）
const cnyEquivalent = computed(() => {
  if (!isForeignCurrency.value || !exchangeRates || amountNum.value <= 0) return 0
  return convertToCNY(amountNum.value, trip.value!.currency, exchangeRates)
})

onMounted(async () => {
  if (trip.value && trip.value.currency !== 'CNY') {
    const data = await fetchRates()
    exchangeRates = data.rates
    rateText.value = getRateText(trip.value.currency, data.rates)
  }

  // 编辑模式：加载已有数据
  if (isEditing.value && trip.value) {
    const expense = trip.value.expenses.find(e => e.id === editingExpenseId)
    if (expense) loadExpense(expense)
  } else {
    // 新增模式：恢复草稿，如果没有草稿则初始化默认值
    if (!loadDraft()) {
      resetForm()
    }
  }
})

// 图片压缩
function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 800
        let w = img.width
        let h = img.height
        if (w > maxW) {
          h = (h * maxW) / w
          w = maxW
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

async function onImageSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files) return
  const remaining = 9 - images.value.length
  for (let i = 0; i < Math.min(files.length, remaining); i++) {
    const base64 = await compressImage(files[i])
    images.value.push(base64)
  }
  input.value = ''
}

function previewImage(idx: number) {
  const img = document.createElement('div')
  img.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer'
  img.innerHTML = `<img src="${images.value[idx]}" style="max-width:95%;max-height:90%;border-radius:8px" />`
  img.onclick = () => img.remove()
  document.body.appendChild(img)
}

// ===== 加载已有消费记录（编辑模式） =====
function loadExpense(expense: TripExpense) {
  // 直接用原始币种金额填充输入框
  amountStr.value = expense.amount.toFixed(2)
  payerId.value = expense.payerId
  splitAmong.value = [...expense.splitAmong]
  splitMode.value = expense.splitMode || 'equal'
  categoryId.value = expense.categoryId
  payMethod.value = expense.payMethod || 'wechat'
  images.value = expense.images ? [...expense.images] : []
  note.value = expense.note
  date.value = expense.date

  // 自定义金额：直接用原始币种金额
  if (expense.splitMode === 'custom' && expense.splitAmounts) {
    Object.entries(expense.splitAmounts).forEach(([memberId, amount]) => {
      customAmounts[memberId] = amount.toFixed(2)
    })
  }
}

// ===== 当分摊人变化时，清理自定义金额 =====
watch(splitAmong, (newVal) => {
  const keys = Object.keys(customAmounts)
  keys.forEach(k => {
    if (!newVal.includes(k)) delete customAmounts[k]
  })
})

function toggleAll() {
  if (!trip.value) return
  if (isAllSelected.value) {
    splitAmong.value = []
  } else {
    splitAmong.value = trip.value.members.map(m => m.id)
  }
}

function toggleSplit(id: string) {
  const idx = splitAmong.value.indexOf(id)
  if (idx >= 0) splitAmong.value.splice(idx, 1)
  else splitAmong.value.push(id)
}

function getMemberName(id: string) {
  return trip.value ? store.getMemberName(trip.value, id) : '?'
}

function getMemberColor(id: string) {
  return trip.value ? store.getMemberColor(trip.value, id) : '#ccc'
}

// ===== 保存 =====
async function save() {
  if (!amountNum.value || amountNum.value <= 0) { alert('请输入金额'); return }
  if (!payerId.value) { alert('请选择付款人'); return }
  if (splitAmong.value.length === 0) { alert('请选择参与分摊的成员'); return }

  // 自定义模式下校验
  if (splitMode.value === 'custom') {
    if (customTotal.value <= 0) { alert('请输入每个人的金额'); return }
  }

  // splitAmounts 存储原始币种金额
  const splitAmounts: Record<string, number> = {}
  if (splitMode.value === 'custom') {
    splitAmong.value.forEach(id => {
      splitAmounts[id] = parseFloat(customAmounts[id]) || 0
    })
  }

  const expenseCurrency = trip.value?.currency || 'CNY'

  if (!isEditing.value) {
    await store.addExpense(tripId, {
      payerId: payerId.value,
      amount: amountNum.value,
      currency: expenseCurrency,
      splitAmong: [...splitAmong.value],
      splitMode: splitMode.value,
      splitAmounts,
      categoryId: categoryId.value,
      payMethod: payMethod.value,
      images: [...images.value],
      note: note.value.trim(),
      date: date.value,
    })
  } else {
    await store.updateExpense(tripId, editingExpenseId, {
      payerId: payerId.value,
      amount: amountNum.value,
      currency: expenseCurrency,
      splitAmong: [...splitAmong.value],
      splitMode: splitMode.value,
      splitAmounts,
      categoryId: categoryId.value,
      payMethod: payMethod.value,
      images: [...images.value],
      note: note.value.trim(),
      date: date.value,
    })
  }

  router.back()
  clearDraft()
}
</script>

<style scoped>
/* ===== 页面容器 ===== */
.add-expense-page {
  padding: 0 16px 48px;
  min-height: 100vh;
  background: var(--bg);
}

/* ===== 返回导航（磨砂玻璃） ===== */
.trip-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.trip-nav-back {
  width: 38px;
  height: 38px;
  border: none;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.trip-nav-back:active {
  transform: scale(0.92);
}

.trip-nav-title {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.3px;
}

.trip-nav-placeholder {
  width: 38px;
}

/* ===== 草稿恢复提示（精致 toast） ===== */
.draft-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--primary-gradient-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 16px;
  animation: slideDown 0.35s ease;
}

.draft-toast-icon {
  flex-shrink: 0;
}

.draft-toast-text {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.draft-discard {
  border: none;
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 20px;
  transition: background 0.2s;
}

.draft-discard:active {
  background: rgba(0, 0, 0, 0.1);
}

/* ===== 金额卡片 ===== */
.amount-card {
  padding: 28px 20px 20px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin-bottom: 14px;
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}

.foreign-amount-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
  position: relative;
}

.foreign-symbol {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  margin-right: 8px;
  color: var(--primary);
}

.foreign-input {
  flex: 1;
  border: none;
  outline: none;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  background: transparent;
  color: var(--text);
}

.foreign-input::placeholder {
  color: rgba(0, 0, 0, 0.25);
}

.foreign-code {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--primary);
  font-weight: 600;
  margin-left: 8px;
  background: var(--bg);
  padding: 2px 8px;
  border-radius: 6px;
}

.cny-amount-row {
  display: flex;
  align-items: baseline;
}

.cny-label {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--primary);
  font-weight: 600;
  margin-left: 8px;
  background: var(--bg);
  padding: 2px 8px;
  border-radius: 6px;
}

.rate-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  font-weight: 500;
}

.currency {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  margin-right: 8px;
  color: var(--primary);
}

.amount-input {
  flex: 1;
  border: none;
  outline: none;
  font-family: var(--font-display);
  font-size: 42px;
  font-weight: 800;
  background: transparent;
  color: var(--text);
  letter-spacing: 1px;
}

.amount-input::placeholder {
  color: rgba(0, 0, 0, 0.25);
}

/* ===== 卡片通用 ===== */
.card {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 18px;
  margin-bottom: 14px;
  box-shadow: var(--shadow);
}

.card-label {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  letter-spacing: 0.3px;
}

.toggle-all {
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 14px;
  border-radius: 20px;
  transition: background 0.2s;
}

.toggle-all:active {
  background: rgba(0, 0, 0, 0.1);
}

/* ===== 成员选择器 chip ===== */
.picker-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.picker-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border: 2px solid var(--border);
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text);
  background: var(--card-bg);
}

.picker-chip:active {
  transform: scale(0.95);
}

.picker-chip.active {
  color: white;
  border-color: transparent;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
}

.chip-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

/* ===== 分摊方式切换（pill 形） ===== */
.mode-switch {
  display: flex;
  background: var(--bg);
  border-radius: 24px;
  padding: 3px;
  margin-top: 14px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
}

.mode-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mode-btn.active {
  background: var(--primary-gradient);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

/* ===== 均摊提示 ===== */
.split-hint {
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: center;
  padding: 10px;
  background: var(--bg);
  border-radius: 12px;
}

.split-hint-warning {
  background: var(--bg);
}

/* ===== 自定义金额 ===== */
.custom-amounts {
  margin-top: 14px;
}

.custom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.custom-row:last-of-type {
  border-bottom: none;
}

.custom-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
}

.custom-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.custom-input-wrap {
  display: flex;
  align-items: center;
  background: var(--bg);
  border-radius: 12px;
  padding: 8px 14px;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.custom-input-wrap:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
}

.custom-currency {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--text-secondary);
  margin-right: 6px;
  font-weight: 600;
}

.custom-input {
  width: 80px;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  text-align: right;
  color: var(--text);
}

.custom-input::placeholder {
  color: #ccc;
  font-weight: 400;
}

.custom-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 10px 16px;
  background: var(--bg);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.custom-summary span:last-child {
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--text);
}

.custom-summary .over {
  color: var(--expense);
}

.custom-summary .under {
  color: var(--text-secondary);
}

.custom-warning {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  padding-left: 4px;
  font-weight: 500;
}

/* ===== 分类网格 ===== */
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.cat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 4px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  background: var(--bg);
}

.cat-item:active {
  transform: scale(0.93);
}

.cat-item.active {
  background: rgba(0, 0, 0, 0.03);
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.cat-icon {
  font-size: 26px;
  transition: transform 0.2s;
}

.cat-item.active .cat-icon {
  transform: scale(1.1);
}

.cat-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
}

.cat-item.active .cat-name {
  color: var(--primary);
  font-weight: 600;
}

/* ===== 表单 ===== */
.form-row {
  margin-bottom: 12px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-label {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: block;
  letter-spacing: 0.3px;
}

.input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 12px;
  font-size: 15px;
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
}

.input::placeholder {
  color: #bbb;
}

/* ===== 图片上传 ===== */
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.image-item {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s;
}

.image-preview:active {
  transform: scale(1.03);
}

.image-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 0.2s;
}

.image-remove:active {
  background: rgba(0, 0, 0, 0.65);
}

.image-add {
  width: 84px;
  height: 84px;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg);
}

.image-add:active {
  border-color: var(--primary);
  background: rgba(0, 0, 0, 0.04);
  transform: scale(0.95);
}

.image-input {
  display: none;
}

.image-add-icon {
  opacity: 0.6;
}

.image-add-text {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* ===== 支付方式 ===== */
.pay-method-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.pm-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  border: 2px solid var(--border);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--card-bg);
}

.pm-chip:active {
  transform: scale(0.95);
}

.pm-chip.active {
  border-color: var(--primary);
  background: rgba(0, 0, 0, 0.03);
  color: var(--primary);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* ===== 保存按钮 ===== */
.save-btn {
  margin-top: 20px;
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-display);
  border-radius: var(--radius);
  background: var(--primary-gradient);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border: none;
  letter-spacing: 0.5px;
  transition: all 0.25s ease;
}

.save-btn:active {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* ===== 动画 ===== */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
