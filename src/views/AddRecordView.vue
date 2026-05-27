<template>
  <div class="add-page">
    <div class="page-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <span class="page-title">记一笔</span>
      <span style="width: 32px"></span>
    </div>

    <!-- 收入/支出切换 -->
    <div class="type-switch">
      <button
        class="type-btn"
        :class="{ active: form.type === 'expense' }"
        @click="form.type = 'expense'"
      >
        支出
      </button>
      <button
        class="type-btn"
        :class="{ active: form.type === 'income' }"
        @click="form.type = 'income'"
      >
        收入
      </button>
    </div>

    <!-- 金额输入 -->
    <div class="amount-section">
      <div v-if="form.currency !== 'CNY'" class="foreign-row">
        <span class="foreign-symbol">{{ selectedCurrencyInfo.symbol }}</span>
        <input
          v-model="foreignAmountDisplay"
          type="text"
          class="foreign-amount-input"
          placeholder="外币金额"
          inputmode="decimal"
          @input="onForeignInput"
        />
        <span class="foreign-code">{{ form.currency }}</span>
      </div>
      <div class="cny-row">
        <span class="currency">¥</span>
        <input
          ref="amountInput"
          v-model="amountDisplay"
          type="text"
          class="amount-input"
          placeholder="0.00"
          inputmode="decimal"
          @focus="onAmountFocus"
        />
        <span class="cny-tag">CNY</span>
      </div>
      <div v-if="form.currency !== 'CNY' && rateText" class="rate-hint">
        {{ rateText }}
      </div>
    </div>

    <!-- 币种选择 -->
    <div class="card">
      <div class="form-row">
        <label class="form-label">币种</label>
        <select v-model="form.currency" class="input currency-select">
          <option v-for="cur in displayCurrencies" :key="cur.code" :value="cur.code">
            {{ cur.flag }} {{ cur.name }} ({{ cur.code }})
          </option>
        </select>
      </div>
    </div>

    <!-- 分类选择 -->
    <div class="card">
      <div class="section-label">分类</div>
      <div class="category-grid">
        <div
          v-for="cat in currentCategories"
          :key="cat.id"
          class="category-item"
          :class="{ selected: form.categoryId === cat.id }"
          @click="form.categoryId = cat.id"
        >
          <span class="cat-icon">{{ cat.icon }}</span>
          <span class="cat-name">{{ cat.name }}</span>
        </div>
      </div>
    </div>

    <!-- 详情 -->
    <div class="card">
      <div class="form-row">
        <label class="form-label">日期</label>
        <input v-model="form.date" type="date" class="input" />
      </div>
      <div class="form-row">
        <label class="form-label">账户</label>
        <select v-model="form.accountId" class="input">
          <option v-for="acc in store.accounts" :key="acc.id" :value="acc.id">
            {{ acc.icon }} {{ acc.name }} (¥{{ formatMoney(acc.balance) }})
          </option>
        </select>
      </div>
      <div class="form-row">
        <label class="form-label">备注</label>
        <input v-model="form.note" type="text" class="input" placeholder="添加备注..." />
      </div>
      <div class="form-row">
        <label class="form-label">标签</label>
        <div class="tags-input">
          <span v-for="tag in form.tags" :key="tag" class="tag">
            {{ tag }}
            <button class="tag-remove" @click="removeTag(tag)">×</button>
          </span>
          <input
            v-model="newTag"
            type="text"
            class="tag-input"
            placeholder="输入标签后回车"
            @keydown.enter.prevent="addTag"
          />
        </div>
      </div>
    </div>

    <!-- 保存按钮 -->
    <button class="btn btn-primary btn-block save-btn" @click="saveRecord">
      保存
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExpenseStore } from '../stores/expense'
import { formatMoney } from '../utils/storage'
import { fetchRates, convertToCNY, getRateText } from '../utils/exchange-rate'
import { popularCurrencies, getCurrencyInfo } from '../types/currencies'

const route = useRoute()
const router = useRouter()
const store = useExpenseStore()

const amountInput = ref<HTMLInputElement | null>(null)
const amountDisplay = ref('')
const foreignAmountDisplay = ref('')
const newTag = ref('')

const form = ref({
  type: (route.query.type as 'income' | 'expense') || 'expense',
  amount: 0,
  originalAmount: undefined as number | undefined,
  currency: 'CNY',
  categoryId: (route.query.categoryId as string) || '',
  date: new Date().toISOString().split('T')[0],
  note: '',
  tags: [] as string[],
  accountId: store.accounts.find(a => a.isDefault)?.id || store.accounts[0]?.id || '',
})

const displayCurrencies = popularCurrencies.slice(0, 10)
const selectedCurrencyInfo = computed(() => getCurrencyInfo(form.value.currency))
const currentCategories = computed(() =>
  form.value.type === 'expense' ? store.expenseCategories : store.incomeCategories
)

const rateText = ref('')
let exchangeRates: Record<string, number> = {}

onMounted(async () => {
  const data = await fetchRates()
  exchangeRates = data.rates
  rateText.value = getRateText(form.value.currency, data.rates)
  if (!form.value.categoryId && currentCategories.value.length > 0) {
    form.value.categoryId = currentCategories.value[0].id
  }
  amountInput.value?.focus()
})

function onForeignInput() {
  const foreign = parseFloat(foreignAmountDisplay.value) || 0
  if (foreign > 0) {
    const cny = convertToCNY(foreign, form.value.currency, exchangeRates)
    amountDisplay.value = cny.toFixed(2)
    form.value.originalAmount = foreign
  } else {
    amountDisplay.value = ''
    form.value.originalAmount = undefined
  }
}

function onAmountFocus() {
  if (amountDisplay.value === '') {
    amountDisplay.value = ''
  }
}

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag)
  }
  newTag.value = ''
}

function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter(t => t !== tag)
}

async function saveRecord() {
  const amount = parseFloat(amountDisplay.value)
  if (!amount || amount <= 0) {
    alert('请输入有效金额')
    return
  }
  if (!form.value.categoryId) {
    alert('请选择分类')
    return
  }

  await store.addRecord({
    type: form.value.type,
    amount,
    categoryId: form.value.categoryId,
    date: form.value.date,
    note: form.value.note,
    tags: form.value.tags,
    accountId: form.value.accountId,
  })

  router.back()
}
</script>

<style scoped>
.add-page {
  padding: 0 12px;
}

.back-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--card-bg);
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow);
}

.type-switch {
  display: flex;
  background: var(--card-bg);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 16px;
  box-shadow: var(--shadow);
}

.type-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.type-btn.active.expense {
  background: var(--expense);
  color: white;
}

.type-btn.active.income {
  background: var(--income);
  color: white;
}

.amount-section {
  padding: 16px;
  background: var(--card-bg);
  border-radius: var(--radius);
  margin-bottom: 12px;
  box-shadow: var(--shadow);
}

.foreign-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 6px;
}

.foreign-symbol {
  font-size: 16px;
  font-weight: 600;
  margin-right: 4px;
  color: var(--text-secondary);
}

.foreign-amount-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 20px;
  font-weight: 600;
  background: transparent;
  color: var(--text-secondary);
}

.foreign-amount-input::placeholder {
  color: #ddd;
}

.foreign-code {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 4px;
}

.cny-row {
  display: flex;
  align-items: baseline;
}

.cny-tag {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 4px;
}

.rate-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

.currency-select {
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.currency {
  font-size: 24px;
  font-weight: 600;
  margin-right: 8px;
  color: var(--text);
}

.amount-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 36px;
  font-weight: 700;
  background: transparent;
  color: var(--text);
}

.amount-input::placeholder {
  color: #ddd;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-secondary);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item.selected {
  background: var(--primary-light);
}

.category-item.selected .cat-icon {
  transform: scale(1.1);
}

.cat-icon {
  font-size: 26px;
  transition: transform 0.2s;
}

.cat-name {
  font-size: 11px;
  color: var(--text-secondary);
}

.form-row {
  margin-bottom: 14px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text-secondary);
}

.tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  min-height: 40px;
  align-items: center;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 4px;
  font-size: 12px;
}

.tag-remove {
  border: none;
  background: none;
  color: var(--primary);
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
}

.tag-input {
  border: none;
  outline: none;
  font-size: 13px;
  flex: 1;
  min-width: 80px;
  background: transparent;
}

.save-btn {
  margin-top: 16px;
  padding: 14px;
  font-size: 16px;
  border-radius: 10px;
}
</style>
