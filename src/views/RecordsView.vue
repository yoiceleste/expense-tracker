<template>
  <div class="records-page">
    <div class="page-header">
      <span class="page-title">账单明细</span>
    </div>

    <!-- 搜索和筛选 -->
    <div class="card search-card">
      <div class="search-row">
        <input
          v-model="searchQuery"
          type="text"
          class="input search-input"
          placeholder="搜索备注、分类、标签..."
        />
        <button class="filter-btn" @click="showFilter = !showFilter">
          {{ showFilter ? '收起' : '筛选' }}
        </button>
      </div>

      <div v-if="showFilter" class="filter-section">
        <div class="filter-row">
          <label>类型：</label>
          <div class="filter-options">
            <button
              class="filter-chip"
              :class="{ active: filter.type === undefined }"
              @click="filter.type = undefined"
            >
              全部
            </button>
            <button
              class="filter-chip expense"
              :class="{ active: filter.type === 'expense' }"
              @click="filter.type = 'expense'"
            >
              支出
            </button>
            <button
              class="filter-chip income"
              :class="{ active: filter.type === 'income' }"
              @click="filter.type = 'income'"
            >
              收入
            </button>
          </div>
        </div>
        <div class="filter-row">
          <label>分类：</label>
          <select v-model="filter.categoryId" class="input filter-select">
            <option value="">全部分类</option>
            <option v-for="cat in allCategories" :key="cat.id" :value="cat.id">
              {{ cat.icon }} {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="filter-row">
          <label>日期：</label>
          <div class="date-range">
            <input v-model="filter.startDate" type="date" class="input" />
            <span>至</span>
            <input v-model="filter.endDate" type="date" class="input" />
          </div>
        </div>
        <div class="filter-row">
          <label>标签：</label>
          <div class="filter-options">
            <button
              class="filter-chip"
              :class="{ active: !filter.tag }"
              @click="filter.tag = undefined"
            >
              全部
            </button>
            <button
              v-for="tag in allTags"
              :key="tag"
              class="filter-chip"
              :class="{ active: filter.tag === tag }"
              @click="filter.tag = filter.tag === tag ? undefined : tag"
            >
              {{ tag }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 记录列表 -->
    <div v-if="filteredRecords.length === 0" class="empty-state">
      <div class="icon">🔍</div>
      <div class="text">没有找到匹配的记录</div>
    </div>

    <template v-else>
      <div v-for="(group, date) in groupedRecords" :key="date" class="card">
        <div class="date-header">
          <span class="date-text">{{ formatDate(date) }}</span>
          <span class="date-summary">
            收入 ¥{{ formatMoney(group.income) }} / 支出 ¥{{ formatMoney(group.expense) }}
          </span>
        </div>
        <div
          v-for="record in group.records"
          :key="record.id"
          class="record-item"
        >
          <div class="record-left">
            <span class="record-icon">{{ getCategoryIcon(record.categoryId) }}</span>
            <div class="record-info">
              <div class="record-category">
                {{ getCategoryName(record.categoryId) }}
                <span v-if="record.tags.length" class="record-tags">
                  #{{ record.tags.join(' #') }}
                </span>
              </div>
              <div class="record-note">
                {{ record.note || getAccountName(record.accountId) }}
              </div>
            </div>
          </div>
          <div class="record-right">
            <span class="record-amount" :class="record.type">
              {{ record.type === 'income' ? '+' : '-' }}¥{{ formatMoney(record.amount) }}
            </span>
            <button class="delete-btn" @click="confirmDelete(record.id)">×</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useExpenseStore } from '../stores/expense'
import { formatMoney } from '../utils/storage'
import type { Record } from '../types'

const store = useExpenseStore()

const searchQuery = ref('')
const showFilter = ref(false)

const filter = reactive({
  type: undefined as 'income' | 'expense' | undefined,
  categoryId: '',
  startDate: '',
  endDate: '',
  tag: undefined as string | undefined,
})

const allCategories = computed(() => store.categories)
const allTags = computed(() => store.getAllTags())

const filteredRecords = computed(() => {
  return store.searchRecords({
    keyword: searchQuery.value || undefined,
    type: filter.type,
    categoryId: filter.categoryId || undefined,
    startDate: filter.startDate || undefined,
    endDate: filter.endDate || undefined,
    tag: filter.tag,
  })
})

interface DateGroup {
  records: Record[]
  income: number
  expense: number
}

const groupedRecords = computed(() => {
  const groups: Record<string, DateGroup> = {}
  const sorted = [...filteredRecords.value].sort((a, b) => b.date.localeCompare(a.date))

  sorted.forEach(record => {
    if (!groups[record.date]) {
      groups[record.date] = { records: [], income: 0, expense: 0 }
    }
    groups[record.date].records.push(record)
    if (record.type === 'income') {
      groups[record.date].income += record.amount
    } else {
      groups[record.date].expense += record.amount
    }
  })

  return groups
})

function getCategoryIcon(id: string) {
  return store.categories.find(c => c.id === id)?.icon || '❓'
}

function getCategoryName(id: string) {
  return store.categories.find(c => c.id === id)?.name || '未知'
}

function getAccountName(id: string) {
  return store.accounts.find(a => a.id === id)?.name || ''
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'

  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekDay = weekDays[d.getDay()]
  return `${month}月${day}日 ${weekDay}`
}

async function confirmDelete(id: string) {
  if (confirm('确定删除这条记录吗？')) {
    await store.removeRecord(id)
  }
}
</script>

<style scoped>
.records-page {
  padding: 0 12px;
}

.search-card {
  padding: 12px;
}

.search-row {
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;
}

.filter-btn {
  padding: 8px 14px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  color: var(--primary);
  white-space: nowrap;
}

.filter-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.filter-row {
  margin-bottom: 10px;
}

.filter-row label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: block;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-chip {
  padding: 4px 12px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.filter-chip.active.expense {
  background: var(--expense);
  border-color: var(--expense);
}

.filter-chip.active.income {
  background: var(--income);
  border-color: var(--income);
}

.filter-select {
  font-size: 13px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-range .input {
  flex: 1;
  font-size: 13px;
}

.date-range span {
  color: var(--text-secondary);
  font-size: 12px;
}

/* 日期分组 */
.date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f5f5f5;
}

.date-text {
  font-size: 14px;
  font-weight: 600;
}

.date-summary {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 记录项 */
.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #fafafa;
}

.record-item:last-child {
  border-bottom: none;
}

.record-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.record-icon {
  font-size: 22px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  border-radius: 8px;
  flex-shrink: 0;
}

.record-category {
  font-size: 14px;
  font-weight: 500;
}

.record-tags {
  font-size: 11px;
  color: var(--primary);
  font-weight: 400;
}

.record-note {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.record-amount {
  font-size: 14px;
  font-weight: 600;
}

.record-amount.income {
  color: var(--income);
}

.record-amount.expense {
  color: var(--text);
}

.delete-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #ccc;
  font-size: 18px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  background: var(--expense-light);
  color: var(--expense);
}
</style>
