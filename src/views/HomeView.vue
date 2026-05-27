<template>
  <div class="home-page">
    <!-- 月份选择 -->
    <div class="month-selector">
      <button class="month-btn" @click="prevMonth">‹</button>
      <span class="month-text">{{ displayMonth }}</span>
      <button class="month-btn" @click="nextMonth">›</button>
    </div>

    <!-- 收支概览卡片 -->
    <div class="overview-card">
      <div class="balance-section">
        <div class="balance-label">本月结余</div>
        <div class="balance-amount" :class="{ negative: summary.balance < 0 }">
          ¥{{ formatMoney(summary.balance) }}
        </div>
      </div>
      <div class="income-expense-row">
        <div class="ie-item">
          <div class="ie-label">收入</div>
          <div class="ie-amount income">¥{{ formatMoney(summary.totalIncome) }}</div>
        </div>
        <div class="ie-divider"></div>
        <div class="ie-item">
          <div class="ie-label">支出</div>
          <div class="ie-amount expense">¥{{ formatMoney(summary.totalExpense) }}</div>
        </div>
      </div>
    </div>

    <!-- 预算进度 -->
    <div v-if="budgetList.length > 0" class="card budget-preview">
      <div class="section-title">预算概览</div>
      <div v-for="item in budgetList.slice(0, 3)" :key="item.id" class="budget-item">
        <div class="budget-info">
          <span class="budget-icon">{{ item.categoryIcon }}</span>
          <span class="budget-name">{{ item.categoryName }}</span>
        </div>
        <div class="budget-bar-wrapper">
          <div class="budget-bar">
            <div
              class="budget-fill"
              :style="{ width: Math.min(item.percentage, 100) + '%' }"
              :class="{ over: item.percentage > 100 }"
            ></div>
          </div>
          <span class="budget-text">
            ¥{{ formatMoney(item.spent) }} / ¥{{ formatMoney(item.amount) }}
          </span>
        </div>
      </div>
      <router-link v-if="budgetList.length > 3" to="/budget" class="view-all">
        查看全部预算 →
      </router-link>
    </div>

    <!-- 最近记录 -->
    <div class="card">
      <div class="section-title">
        最近记录
        <router-link to="/records" class="view-all">查看全部 →</router-link>
      </div>
      <div v-if="recentRecords.length === 0" class="empty-state">
        <div class="icon">📝</div>
        <div class="text">暂无记录，点击下方 + 开始记账</div>
      </div>
      <div v-else class="record-list">
        <div
          v-for="record in recentRecords"
          :key="record.id"
          class="record-item"
          @click="viewRecord(record)"
        >
          <div class="record-left">
            <span class="record-icon">{{ getCategoryIcon(record.categoryId) }}</span>
            <div class="record-info">
              <div class="record-category">{{ getCategoryName(record.categoryId) }}</div>
              <div class="record-note">{{ record.note || record.date }}</div>
            </div>
          </div>
          <div class="record-right">
            <span class="record-amount" :class="record.type">
              {{ record.type === 'income' ? '+' : '-' }}¥{{ formatMoney(record.amount) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷记账 -->
    <div class="card">
      <div class="section-title">快捷记账</div>
      <div class="quick-categories">
        <div
          v-for="cat in quickCategories"
          :key="cat.id"
          class="quick-item"
          @click="quickAdd(cat)"
        >
          <span class="quick-icon">{{ cat.icon }}</span>
          <span class="quick-name">{{ cat.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExpenseStore } from '../stores/expense'
import { formatMoney, getCurrentMonth } from '../utils/storage'
import type { Record, Category } from '../types'

const router = useRouter()
const store = useExpenseStore()

const currentMonth = ref(getCurrentMonth())

const displayMonth = computed(() => {
  const [y, m] = currentMonth.value.split('-')
  return `${y}年${parseInt(m)}月`
})

const summary = computed(() => store.getMonthSummary(currentMonth.value))

const budgetList = computed(() => store.getBudgetUsage(currentMonth.value))

const recentRecords = computed(() => {
  return store.getRecordsByMonth(currentMonth.value).slice(0, 5)
})

const quickCategories = computed(() => store.expenseCategories.slice(0, 8))

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

function getCategoryIcon(id: string) {
  return store.categories.find(c => c.id === id)?.icon || '❓'
}

function getCategoryName(id: string) {
  return store.categories.find(c => c.id === id)?.name || '未知'
}

function viewRecord(record: Record) {
  router.push({ path: '/records', query: { id: record.id } })
}

function quickAdd(cat: Category) {
  router.push({ path: '/add', query: { categoryId: cat.id, type: cat.type } })
}
</script>

<style scoped>
.home-page {
  padding: 0 12px;
}

.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 16px 0;
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

.overview-card {
  background: linear-gradient(135deg, var(--primary), #7b93ff);
  border-radius: var(--radius);
  padding: 24px 20px;
  color: white;
  margin-bottom: 12px;
  box-shadow: 0 4px 16px rgba(79, 110, 247, 0.3);
}

.balance-label {
  font-size: 13px;
  opacity: 0.85;
}

.balance-amount {
  font-size: 32px;
  font-weight: 700;
  margin: 4px 0 16px;
}

.balance-amount.negative {
  color: #ffccc7;
}

.income-expense-row {
  display: flex;
  align-items: center;
}

.ie-item {
  flex: 1;
}

.ie-label {
  font-size: 12px;
  opacity: 0.75;
}

.ie-amount {
  font-size: 18px;
  font-weight: 600;
  margin-top: 2px;
}

.ie-divider {
  width: 1px;
  height: 30px;
  background: rgba(255, 255, 255, 0.3);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.view-all {
  font-size: 13px;
  color: var(--primary);
  text-decoration: none;
  font-weight: 400;
}

/* 预算 */
.budget-item {
  margin-bottom: 12px;
}

.budget-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.budget-icon {
  font-size: 16px;
}

.budget-name {
  font-size: 13px;
  color: var(--text-secondary);
}

.budget-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.budget-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.budget-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 3px;
  transition: width 0.3s;
}

.budget-fill.over {
  background: var(--expense);
}

.budget-text {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* 记录列表 */
.record-list {
  display: flex;
  flex-direction: column;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
}

.record-item:last-child {
  border-bottom: none;
}

.record-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.record-icon {
  font-size: 24px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  border-radius: 8px;
}

.record-category {
  font-size: 14px;
  font-weight: 500;
}

.record-note {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.record-amount {
  font-size: 15px;
  font-weight: 600;
}

.record-amount.income {
  color: var(--income);
}

.record-amount.expense {
  color: var(--text);
}

/* 快捷记账 */
.quick-categories {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.quick-item:active {
  background: var(--primary-light);
}

.quick-icon {
  font-size: 24px;
}

.quick-name {
  font-size: 11px;
  color: var(--text-secondary);
}
</style>
