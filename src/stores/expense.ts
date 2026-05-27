import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Record, Category, Account, Budget, MonthSummary, CategorySummary } from '../types'
import { defaultExpenseCategories, defaultIncomeCategories, defaultAccounts } from '../types/defaults'
import * as storage from '../utils/storage'

export const useExpenseStore = defineStore('expense', () => {
  // ===== State =====
  const records = ref<Record[]>([])
  const categories = ref<Category[]>([])
  const accounts = ref<Account[]>([])
  const budgets = ref<Budget[]>([])
  const initialized = ref(false)

  // ===== 初始化（异步） =====
  async function init() {
    if (initialized.value) return

    // 加载分类（如果没有则使用默认）
    const savedCategories = await storage.getCategories()
    if (savedCategories.length === 0) {
      const defaults = [...defaultExpenseCategories, ...defaultIncomeCategories]
      categories.value = defaults
      // 批量写入默认分类
      for (const cat of defaults) {
        await storage.addCategory(cat)
      }
    } else {
      categories.value = savedCategories
    }

    // 加载账户
    const savedAccounts = await storage.getAccounts()
    if (savedAccounts.length === 0) {
      accounts.value = defaultAccounts
      await storage.saveAccounts(defaultAccounts)
    } else {
      accounts.value = savedAccounts
    }

    // 加载记录和预算
    records.value = await storage.getRecords()
    budgets.value = await storage.getBudgets()

    initialized.value = true
  }

  // ===== Getters =====
  const expenseCategories = computed(() =>
    categories.value.filter(c => c.type === 'expense')
  )

  const incomeCategories = computed(() =>
    categories.value.filter(c => c.type === 'income')
  )

  // 按月筛选记录
  function getRecordsByMonth(month: string) {
    return records.value.filter(r => r.date.startsWith(month))
  }

  // 月度汇总
  function getMonthSummary(month: string): MonthSummary {
    const monthRecords = getRecordsByMonth(month)
    const totalIncome = monthRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0)
    const totalExpense = monthRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0)
    return {
      month,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    }
  }

  // 分类统计
  function getCategorySummary(month: string, type: 'income' | 'expense'): CategorySummary[] {
    const monthRecords = getRecordsByMonth(month).filter(r => r.type === type)
    const total = monthRecords.reduce((sum, r) => sum + r.amount, 0)

    const categoryMap = new Map<string, CategorySummary>()
    monthRecords.forEach(r => {
      const existing = categoryMap.get(r.categoryId)
      if (existing) {
        existing.amount += r.amount
        existing.count += 1
      } else {
        const cat = categories.value.find(c => c.id === r.categoryId)
        categoryMap.set(r.categoryId, {
          categoryId: r.categoryId,
          categoryName: cat?.name || '未知',
          categoryIcon: cat?.icon || '❓',
          amount: r.amount,
          percentage: 0,
          count: 1,
        })
      }
    })

    const result = Array.from(categoryMap.values())
    result.forEach(item => {
      item.percentage = total > 0 ? (item.amount / total) * 100 : 0
    })
    result.sort((a, b) => b.amount - a.amount)
    return result
  }

  // 预算使用情况
  function getBudgetUsage(month: string) {
    const monthExpenses = getRecordsByMonth(month).filter(r => r.type === 'expense')
    return budgets.value
      .filter(b => b.month === month)
      .map(b => {
        const spent = b.categoryId
          ? monthExpenses.filter(r => r.categoryId === b.categoryId).reduce((s, r) => s + r.amount, 0)
          : monthExpenses.reduce((s, r) => s + r.amount, 0)
        const cat = b.categoryId ? categories.value.find(c => c.id === b.categoryId) : null
        return {
          ...b,
          categoryName: cat?.name || '总预算',
          categoryIcon: cat?.icon || '📊',
          spent,
          remaining: b.amount - spent,
          percentage: b.amount > 0 ? (spent / b.amount) * 100 : 0,
        }
      })
  }

  // 搜索记录
  function searchRecords(query: {
    keyword?: string
    type?: 'income' | 'expense'
    categoryId?: string
    startDate?: string
    endDate?: string
    tag?: string
  }) {
    return records.value.filter(r => {
      if (query.type && r.type !== query.type) return false
      if (query.categoryId && r.categoryId !== query.categoryId) return false
      if (query.startDate && r.date < query.startDate) return false
      if (query.endDate && r.date > query.endDate) return false
      if (query.keyword) {
        const kw = query.keyword.toLowerCase()
        const cat = categories.value.find(c => c.id === r.categoryId)
        const matchNote = r.note.toLowerCase().includes(kw)
        const matchCategory = cat?.name.toLowerCase().includes(kw)
        const matchTag = r.tags.some(t => t.toLowerCase().includes(kw))
        if (!matchNote && !matchCategory && !matchTag) return false
      }
      if (query.tag && !r.tags.includes(query.tag)) return false
      return true
    })
  }

  // 获取所有标签
  function getAllTags(): string[] {
    const tagSet = new Set<string>()
    records.value.forEach(r => r.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }

  // ===== Actions =====
  async function addRecord(data: Omit<Record, 'id' | 'createdAt'>) {
    const record: Record = {
      ...data,
      id: storage.generateId(),
      createdAt: Date.now(),
    }
    records.value.unshift(record)
    await storage.addRecord(record)

    // 更新账户余额
    const account = accounts.value.find(a => a.id === data.accountId)
    if (account) {
      account.balance += data.type === 'income' ? data.amount : -data.amount
      await storage.saveAccounts(accounts.value)
    }

    return record
  }

  async function updateRecordData(id: string, data: Partial<Record>) {
    const index = records.value.findIndex(r => r.id === id)
    if (index === -1) return

    const oldRecord = records.value[index]
    const newRecord = { ...oldRecord, ...data }
    records.value[index] = newRecord
    await storage.updateRecord(newRecord)

    // 更新账户余额（如果金额或类型变化）
    if (data.amount !== undefined || data.type !== undefined || data.accountId !== undefined) {
      const oldAccount = accounts.value.find(a => a.id === oldRecord.accountId)
      const newAccount = accounts.value.find(a => a.id === newRecord.accountId)

      // 扣除旧记录影响
      if (oldAccount) {
        oldAccount.balance += oldRecord.type === 'income' ? -oldRecord.amount : oldRecord.amount
      }
      // 加上新记录影响
      if (newAccount) {
        newAccount.balance += newRecord.type === 'income' ? newRecord.amount : -newRecord.amount
      }
      await storage.saveAccounts(accounts.value)
    }
  }

  async function removeRecord(id: string) {
    const record = records.value.find(r => r.id === id)
    if (!record) return

    // 恢复账户余额
    const account = accounts.value.find(a => a.id === record.accountId)
    if (account) {
      account.balance += record.type === 'income' ? -record.amount : record.amount
      await storage.saveAccounts(accounts.value)
    }

    records.value = records.value.filter(r => r.id !== id)
    await storage.deleteRecord(id)
  }

  async function addCategoryData(data: Omit<Category, 'id'>) {
    const category: Category = { ...data, id: storage.generateId() }
    categories.value.push(category)
    await storage.addCategory(category)
    return category
  }

  async function removeCategory(id: string) {
    categories.value = categories.value.filter(c => c.id !== id)
    await storage.deleteCategory(id)
  }

  async function addBudgetData(data: Omit<Budget, 'id'>) {
    const budget: Budget = { ...data, id: storage.generateId() }
    budgets.value.push(budget)
    await storage.addBudget(budget)
    return budget
  }

  async function removeBudget(id: string) {
    budgets.value = budgets.value.filter(b => b.id !== id)
    await storage.deleteBudget(id)
  }

  // 数据导入导出
  async function exportAllData() {
    return storage.exportData()
  }

  async function importAllData(data: Awaited<ReturnType<typeof storage.exportData>>) {
    await storage.importData(data)
    initialized.value = false
    await init()
  }

  return {
    records,
    categories,
    accounts,
    budgets,
    initialized,
    expenseCategories,
    incomeCategories,
    init,
    getRecordsByMonth,
    getMonthSummary,
    getCategorySummary,
    getBudgetUsage,
    searchRecords,
    getAllTags,
    addRecord,
    updateRecordData,
    removeRecord,
    addCategoryData,
    removeCategory,
    addBudgetData,
    removeBudget,
    exportAllData,
    importAllData,
  }
})
