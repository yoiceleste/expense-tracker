<template>
  <div class="budget-page">
    <div class="page-header">
      <span class="page-title">预算管理</span>
      <button class="btn btn-primary" @click="showAdd = true">+ 新增</button>
    </div>

    <!-- 月份选择 -->
    <div class="month-selector">
      <button class="month-btn" @click="prevMonth">‹</button>
      <span class="month-text">{{ displayMonth }}</span>
      <button class="month-btn" @click="nextMonth">›</button>
    </div>

    <!-- 总预算概览 -->
    <div class="card budget-overview">
      <div class="budget-header">
        <span class="budget-title">本月支出</span>
        <span class="budget-total">¥{{ formatMoney(totalSpent) }} / ¥{{ formatMoney(totalBudget) }}</span>
      </div>
      <div class="budget-progress">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: Math.min(totalPercentage, 100) + '%' }"
            :class="{ over: totalPercentage > 100, warning: totalPercentage > 80 && totalPercentage <= 100 }"
          ></div>
        </div>
        <span class="progress-text" :class="{ over: totalPercentage > 100 }">
          {{ totalPercentage.toFixed(1) }}%
        </span>
      </div>
      <div class="budget-remaining" :class="{ over: totalPercentage > 100 }">
        {{ totalPercentage > 100 ? '已超支' : '剩余' }} ¥{{ formatMoney(Math.abs(totalBudget - totalSpent)) }}
      </div>
    </div>

    <!-- 分类预算列表 -->
    <div v-if="budgetUsage.length === 0" class="empty-state">
      <div class="icon">📊</div>
      <div class="text">暂无预算设置</div>
      <button class="btn btn-primary" style="margin-top: 12px" @click="showAdd = true">设置预算</button>
    </div>

    <div v-for="item in budgetUsage" :key="item.id" class="card budget-card">
      <div class="budget-card-header">
        <div class="budget-info">
          <span class="budget-icon">{{ item.categoryIcon }}</span>
          <span class="budget-name">{{ item.categoryName }}</span>
        </div>
        <button class="delete-btn" @click="removeBudget(item.id)">删除</button>
      </div>
      <div class="budget-amounts">
        <span>已花 <strong>¥{{ formatMoney(item.spent) }}</strong></span>
        <span>预算 ¥{{ formatMoney(item.amount) }}</span>
      </div>
      <div class="budget-progress">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: Math.min(item.percentage, 100) + '%' }"
            :class="{ over: item.percentage > 100, warning: item.percentage > 80 && item.percentage <= 100 }"
          ></div>
        </div>
        <span class="progress-text" :class="{ over: item.percentage > 100 }">
          {{ item.percentage.toFixed(1) }}%
        </span>
      </div>
      <div class="budget-remaining" :class="{ over: item.percentage > 100 }">
        {{ item.percentage > 100 ? '已超支' : '剩余' }} ¥{{ formatMoney(Math.abs(item.remaining)) }}
      </div>
    </div>

    <!-- 新增预算弹窗 -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal">
        <div class="modal-title">新增预算</div>
        <div class="form-row">
          <label class="form-label">分类</label>
          <select v-model="newBudget.categoryId" class="input">
            <option value="">总预算（所有支出）</option>
            <option v-for="cat in store.expenseCategories" :key="cat.id" :value="cat.id">
              {{ cat.icon }} {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">预算金额</label>
          <input
            v-model="newBudget.amount"
            type="number"
            class="input"
            placeholder="输入预算金额"
            min="0"
            step="100"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showAdd = false">取消</button>
          <button class="btn btn-primary" @click="addBudget">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useExpenseStore } from '../stores/expense'
import { formatMoney, getCurrentMonth } from '../utils/storage'

const store = useExpenseStore()

const currentMonth = ref(getCurrentMonth())
const showAdd = ref(false)

const newBudget = reactive({
  categoryId: '',
  amount: '',
})

const displayMonth = computed(() => {
  const [y, m] = currentMonth.value.split('-')
  return `${y}年${parseInt(m)}月`
})

const budgetUsage = computed(() => store.getBudgetUsage(currentMonth.value))

const totalBudget = computed(() =>
  budgetUsage.value.reduce((s, b) => s + b.amount, 0)
)

const totalSpent = computed(() =>
  budgetUsage.value.reduce((s, b) => s + b.spent, 0)
)

const totalPercentage = computed(() =>
  totalBudget.value > 0 ? (totalSpent.value / totalBudget.value) * 100 : 0
)

function prevMonth() {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth() {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const d = new Date(y, m, 1)
  currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function addBudget() {
  const amount = parseFloat(newBudget.amount)
  if (!amount || amount <= 0) {
    alert('请输入有效金额')
    return
  }

  await store.addBudgetData({
    categoryId: newBudget.categoryId,
    amount,
    month: currentMonth.value,
  })

  newBudget.categoryId = ''
  newBudget.amount = ''
  showAdd.value = false
}

async function removeBudget(id: string) {
  if (confirm('确定删除此预算？')) {
    await store.removeBudget(id)
  }
}
</script>

<style scoped>
.budget-page {
  padding: 0 12px;
}

.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 12px 0;
}

.month-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--card-bg);
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow);
  color: var(--text);
}

.month-text {
  font-size: 18px;
  font-weight: 600;
}

.budget-overview {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.budget-title {
  font-size: 14px;
  opacity: 0.9;
}

.budget-total {
  font-size: 14px;
  font-weight: 600;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-fill.warning {
  background: #ffc53d;
}

.progress-fill.over {
  background: #ff7875;
}

.budget-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  min-width: 48px;
  text-align: right;
}

.progress-text.over {
  color: #ff7875;
}

.budget-remaining {
  font-size: 13px;
  opacity: 0.85;
}

.budget-remaining.over {
  color: #ff7875;
}

/* 分类预算卡片 */
.budget-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.budget-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.budget-icon {
  font-size: 22px;
}

.budget-name {
  font-size: 15px;
  font-weight: 500;
}

.delete-btn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.delete-btn:hover {
  border-color: var(--expense);
  color: var(--expense);
}

.budget-amounts {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.budget-amounts strong {
  color: var(--text);
}

.budget-card .budget-progress {
  margin-bottom: 6px;
}

.budget-card .progress-bar {
  background: #f0f0f0;
}

.budget-card .progress-fill {
  background: var(--primary);
}

.budget-card .progress-fill.warning {
  background: #ffc53d;
}

.budget-card .progress-fill.over {
  background: var(--expense);
}

.budget-card .progress-text.over {
  color: var(--expense);
}

.budget-card .budget-remaining {
  color: var(--text-secondary);
}

.budget-card .budget-remaining.over {
  color: var(--expense);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  width: 320px;
  max-width: 90vw;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  text-align: center;
}

.form-row {
  margin-bottom: 14px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions .btn {
  flex: 1;
}
</style>
