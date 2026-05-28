<template>
  <div class="add-expense-page">
    <div class="detail-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <span class="header-title">{{ isEditing ? '编辑消费' : '记一笔' }}</span>
      <span style="width:34px"></span>
    </div>

    <!-- 草稿恢复提示 -->
    <div v-if="showDraftTip" class="draft-tip">
      <span>📝 已恢复上次未完成的账单</span>
      <button class="draft-discard" @click="discardDraft">丢弃</button>
    </div>

    <!-- 金额 -->
    <div class="amount-card">
      <div v-if="isForeignCurrency" class="foreign-amount-row">
        <span class="foreign-symbol">{{ currencyInfo.symbol }}</span>
        <input
          v-model="foreignAmountStr"
          type="text"
          class="foreign-input"
          placeholder="外币金额"
          inputmode="decimal"
          @input="onForeignAmountChange"
        />
        <span class="foreign-code">{{ trip?.currency }}</span>
      </div>
      <div class="cny-amount-row">
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
        每人 {{ showForeignSymbol ? currencyInfo.symbol : '¥' }}{{ formatMoney(amountNum / splitAmong.length) }}
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
            <span class="custom-currency">{{ showForeignSymbol ? currencyInfo.symbol : '¥' }}</span>
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
          <span :class="{ over: customTotal > customCompareTotal + 0.01, under: customTotal < customCompareTotal - 0.01 }">
            {{ showForeignSymbol ? currencyInfo.symbol : '¥' }}{{ formatMoney(customTotal) }}
            <template v-if="showForeignSymbol"> ≈ ¥{{ formatMoney(customTotalCNY) }}</template>
          </span>
        </div>
        <div v-if="Math.abs(customTotal - customCompareTotal) > 0.01 && customCompareTotal > 0" class="custom-warning">
          {{ customTotal > customCompareTotal ? '⚠️ 自定义金额合计超出付款金额' : '⚠️ 自定义金额合计不足付款金额' }}
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
          <button class="image-remove" @click="images.splice(idx, 1)">×</button>
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
          <span class="image-add-icon">📷</span>
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
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import { fetchRates, convertToCNY, getRateText, convertFromCNY } from '../../utils/exchange-rate'
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
// 是否显示外币符号：外币旅行 + 用户输入了外币金额
const showForeignSymbol = computed(() => isForeignCurrency.value && foreignAmountStr.value.trim() !== '')

const amountStr = ref('')
const foreignAmountStr = ref('')
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
  // 只在有内容时才保存草稿
  if (!amountStr.value && !note.value && !foreignAmountStr.value) return
  const draft = {
    amountStr: amountStr.value,
    foreignAmountStr: foreignAmountStr.value,
    payerId: payerId.value,
    splitAmong: splitAmong.value,
    splitMode: splitMode.value,
    customAmounts: { ...customAmounts },
    categoryId: categoryId.value,
    payMethod: payMethod.value,
    note: note.value,
    date: date.value,
    // 图片太大不存草稿
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
    if (!draft.amountStr && !draft.note && !draft.foreignAmountStr) return false
    amountStr.value = draft.amountStr || ''
    foreignAmountStr.value = draft.foreignAmountStr || ''
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
  // 重置表单
  amountStr.value = ''
  foreignAmountStr.value = ''
  if (trip.value) {
    payerId.value = trip.value.members[0]?.id || ''
    splitAmong.value = trip.value.members.map(m => m.id)
  }
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

watch([amountStr, foreignAmountStr, payerId, splitAmong, splitMode, categoryId, payMethod, note, date], () => {
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

// 自定义模式下，合计应该和什么对比：外币旅行对比外币总额，人民币对比人民币总额
const customCompareTotal = computed(() => {
  if (isForeignCurrency.value && foreignAmountStr.value) {
    return parseFloat(foreignAmountStr.value) || 0
  }
  return amountNum.value
})

// 自定义合计换算为人民币
const customTotalCNY = computed(() => {
  if (isForeignCurrency.value && exchangeRates) {
    return convertToCNY(customTotal.value, trip.value!.currency, exchangeRates)
  }
  return customTotal.value
})

const isAllSelected = computed(() =>
  trip.value ? splitAmong.value.length === trip.value.members.length : false
)

// 汇率相关
const rateText = ref('')
let exchangeRates: Record<string, number> = {}

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
    // 新增模式：恢复草稿
    restoreDraft()
  }
})

// 图片压缩：最大宽度 800px，质量 0.6
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
  // 简单的全屏预览
  const img = document.createElement('div')
  img.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer'
  img.innerHTML = `<img src="${images.value[idx]}" style="max-width:95%;max-height:90%;border-radius:8px" />`
  img.onclick = () => img.remove()
  document.body.appendChild(img)
}

function loadExpense(expense: TripExpense) {
  amountStr.value = expense.amount.toFixed(2)
  payerId.value = expense.payerId
  splitAmong.value = [...expense.splitAmong]
  splitMode.value = expense.splitMode || 'equal'
  categoryId.value = expense.categoryId
  payMethod.value = expense.payMethod || 'wechat'
  images.value = expense.images ? [...expense.images] : []
  note.value = expense.note
  date.value = expense.date

  // 外币旅行时，反算外币金额
  if (isForeignCurrency.value && exchangeRates) {
    const foreign = convertFromCNY(expense.amount, trip.value!.currency, exchangeRates)
    foreignAmountStr.value = foreign >= 1 ? foreign.toFixed(0) : foreign.toFixed(2)
  }

  // 自定义金额：反算为外币显示
  if (expense.splitMode === 'custom' && expense.splitAmounts && isForeignCurrency.value && exchangeRates) {
    Object.entries(expense.splitAmounts).forEach(([memberId, cnyAmount]) => {
      const foreign = convertFromCNY(cnyAmount, trip.value!.currency, exchangeRates)
      customAmounts[memberId] = foreign >= 1 ? foreign.toFixed(0) : foreign.toFixed(2)
    })
  } else if (expense.splitMode === 'custom' && expense.splitAmounts) {
    Object.entries(expense.splitAmounts).forEach(([memberId, amount]) => {
      customAmounts[memberId] = amount.toFixed(2)
    })
  }
}

function onForeignAmountChange() {
  const foreignAmount = parseFloat(foreignAmountStr.value) || 0
  if (foreignAmount > 0 && exchangeRates) {
    const cnyAmount = convertToCNY(foreignAmount, trip.value!.currency, exchangeRates)
    amountStr.value = cnyAmount.toFixed(2)
  } else {
    amountStr.value = ''
  }
}

// 初始化默认选中
if (trip.value) {
  payerId.value = trip.value.members[0]?.id || ''
  splitAmong.value = trip.value.members.map(m => m.id)
}

// 当分摊人变化时，清理自定义金额
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

async function save() {
  if (!amountNum.value || amountNum.value <= 0) { alert('请输入金额'); return }
  if (!payerId.value) { alert('请选择付款人'); return }
  if (splitAmong.value.length === 0) { alert('请选择分摊人'); return }

  // 自定义模式下校验
  if (splitMode.value === 'custom') {
    if (customTotal.value <= 0) { alert('请输入每个人的金额'); return }
  }

  const splitAmounts: Record<string, number> = {}
  if (splitMode.value === 'custom') {
    splitAmong.value.forEach(id => {
      const raw = parseFloat(customAmounts[id]) || 0
      // 外币旅行时，将外币金额换算为人民币
      if (isForeignCurrency.value && exchangeRates) {
        splitAmounts[id] = convertToCNY(raw, trip.value!.currency, exchangeRates)
      } else {
        splitAmounts[id] = raw
      }
    })
  }

  if (!isEditing.value) {
    await store.addExpense(tripId, {
    payerId: payerId.value,
    amount: amountNum.value,
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
.add-expense-page {
  padding: 0 16px 40px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
}

.header-title {
  font-size: 17px;
  font-weight: 600;
}

/* 草稿提示 */
.draft-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fff8e1;
  border-radius: 10px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #8d6e00;
}

.draft-discard {
  border: none;
  background: none;
  color: #b8860b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
}

/* 金额 */
.amount-card {
  padding: 20px 16px;
  background: var(--card-bg);
  border-radius: 14px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.foreign-amount-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
}

.foreign-symbol {
  font-size: 18px;
  font-weight: 600;
  margin-right: 6px;
  color: var(--text-secondary);
}

.foreign-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 22px;
  font-weight: 600;
  background: transparent;
  color: var(--text-secondary);
}

.foreign-input::placeholder {
  color: #ddd;
}

.foreign-code {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  margin-left: 6px;
}

.cny-amount-row {
  display: flex;
  align-items: baseline;
}

.cny-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-left: 6px;
}

.rate-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

.currency {
  font-size: 24px;
  font-weight: 600;
  margin-right: 6px;
}

.amount-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 36px;
  font-weight: 700;
  background: transparent;
}

.amount-input::placeholder {
  color: #ddd;
}

/* 卡片 */
.card {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.card-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-all {
  border: none;
  background: none;
  color: var(--primary);
  font-size: 13px;
  cursor: pointer;
}

/* 选择器 */
.picker-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.picker-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1.5px solid var(--border);
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text);
}

.picker-chip.active {
  color: white;
  border-color: transparent;
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 分摊方式切换 */
.mode-switch {
  display: flex;
  background: var(--bg);
  border-radius: 8px;
  padding: 3px;
  margin-top: 12px;
}

.mode-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.mode-btn.active {
  background: var(--card-bg);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* 均摊提示 */
.split-hint {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  padding: 8px;
  background: var(--bg);
  border-radius: 8px;
}

/* 自定义金额 */
.custom-amounts {
  margin-top: 12px;
}

.custom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.custom-row:last-of-type {
  border-bottom: none;
}

.custom-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.custom-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.custom-input-wrap {
  display: flex;
  align-items: center;
  background: var(--bg);
  border-radius: 8px;
  padding: 6px 10px;
  border: 1px solid transparent;
  transition: border-color 0.2s;
}

.custom-input-wrap:focus-within {
  border-color: var(--primary);
}

.custom-currency {
  font-size: 14px;
  color: var(--text-secondary);
  margin-right: 4px;
}

.custom-input {
  width: 80px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  font-weight: 600;
  text-align: right;
}

.custom-input::placeholder {
  color: #ccc;
  font-weight: 400;
}

.custom-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding: 8px 12px;
  background: var(--bg);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.custom-summary span:last-child {
  font-weight: 600;
  color: var(--text);
}

.custom-summary .over {
  color: var(--expense);
}

.custom-summary .under {
  color: #faad14;
}

.custom-warning {
  margin-top: 6px;
  font-size: 12px;
  color: #faad14;
  padding-left: 2px;
}

/* 分类网格 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.cat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 4px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.cat-item.active {
  background: var(--primary-light);
}

.cat-icon {
  font-size: 24px;
}

.cat-name {
  font-size: 11px;
  color: var(--text-secondary);
}

/* 表单 */
.form-row {
  margin-bottom: 10px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: block;
}

/* 图片上传 */
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.image-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.image-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(0,0,0,0.5);
  color: white;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.image-add {
  width: 80px;
  height: 80px;
  border: 2px dashed var(--border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.image-add:active {
  border-color: var(--primary);
}

.image-input {
  display: none;
}

.image-add-icon {
  font-size: 22px;
}

.image-add-text {
  font-size: 11px;
  color: var(--text-secondary);
}

/* 支付方式 */
.pay-method-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.pm-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1.5px solid var(--border);
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.pm-chip.active {
  border-color: var(--primary);
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 500;
}

.save-btn {
  margin-top: 16px;
  padding: 14px;
  font-size: 16px;
  border-radius: 12px;
}
</style>
