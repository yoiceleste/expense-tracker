/**
 * 云存储工具模块 - Supabase 实现
 * 函数签名与原 localStorage 版本保持一致，但全部为 async
 */
import { supabase } from '../lib/supabase'
import { getUserId } from '../lib/auth'
import type { Record, Category, Account, Budget } from '../types'

// ===== 工具函数 =====

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

export function formatMoney(amount: number): string {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthDays(month: string): number {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m, 0).getDate()
}

// ===== 记录操作 =====

export async function getRecords(): Promise<Record[]> {
  const uid = getUserId()
  if (!uid) return []
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
  if (error) { console.error('getRecords error:', error); return [] }
  return (data || []).map(rowToRecord)
}

export async function saveRecords(_records: Record[]): Promise<void> {
  // Supabase 模式下不需要全量保存，由各操作函数单独处理
  // 保留此函数签名以兼容 store 代码
  console.warn('saveRecords: Supabase 模式下不需要全量保存')
}

export async function addRecord(record: Record): Promise<Record> {
  const uid = getUserId()
  if (!uid) return record
  const { error } = await supabase.from('records').insert({
    id: record.id,
    user_id: uid,
    type: record.type,
    amount: record.amount,
    original_amount: record.originalAmount ?? null,
    currency: record.currency,
    category_id: record.categoryId,
    note: record.note,
    date: record.date,
    created_at: record.createdAt,
    tags: record.tags,
    account_id: record.accountId,
  })
  if (error) console.error('addRecord error:', error)
  return record
}

export async function updateRecord(record: Record): Promise<Record> {
  const uid = getUserId()
  if (!uid) return record
  const { error } = await supabase.from('records').update({
    type: record.type,
    amount: record.amount,
    original_amount: record.originalAmount ?? null,
    currency: record.currency,
    category_id: record.categoryId,
    note: record.note,
    date: record.date,
    tags: record.tags,
    account_id: record.accountId,
  }).eq('id', record.id).eq('user_id', uid)
  if (error) console.error('updateRecord error:', error)
  return record
}

export async function deleteRecord(id: string): Promise<void> {
  const uid = getUserId()
  if (!uid) return
  const { error } = await supabase.from('records').delete().eq('id', id).eq('user_id', uid)
  if (error) console.error('deleteRecord error:', error)
}

// ===== 分类操作 =====

export async function getCategories(): Promise<Category[]> {
  const uid = getUserId()
  if (!uid) return []
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', uid)
  if (error) { console.error('getCategories error:', error); return [] }
  return (data || []).map(rowToCategory)
}

export async function saveCategories(_categories: Category[]): Promise<void> {
  console.warn('saveCategories: Supabase 模式下不需要全量保存')
}

export async function addCategory(category: Category): Promise<void> {
  const uid = getUserId()
  if (!uid) return
  const { error } = await supabase.from('categories').insert({
    id: category.id,
    user_id: uid,
    name: category.name,
    icon: category.icon,
    type: category.type,
    is_default: category.isDefault,
  })
  if (error) console.error('addCategory error:', error)
}

export async function deleteCategory(id: string): Promise<void> {
  const uid = getUserId()
  if (!uid) return
  const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', uid)
  if (error) console.error('deleteCategory error:', error)
}

// ===== 账户操作 =====

export async function getAccounts(): Promise<Account[]> {
  const uid = getUserId()
  if (!uid) return []
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', uid)
  if (error) { console.error('getAccounts error:', error); return [] }
  return (data || []).map(rowToAccount)
}

export async function saveAccounts(accounts: Account[]): Promise<void> {
  // 逐个 upsert 账户（更新余额等）
  const uid = getUserId()
  if (!uid) return
  for (const acc of accounts) {
    await supabase.from('accounts').upsert({
      id: acc.id,
      user_id: uid,
      name: acc.name,
      icon: acc.icon,
      balance: acc.balance,
      is_default: acc.isDefault,
    }, { onConflict: 'id' })
  }
}

// ===== 预算操作 =====

export async function getBudgets(): Promise<Budget[]> {
  const uid = getUserId()
  if (!uid) return []
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', uid)
  if (error) { console.error('getBudgets error:', error); return [] }
  return (data || []).map(rowToBudget)
}

export async function saveBudgets(_budgets: Budget[]): Promise<void> {
  console.warn('saveBudgets: Supabase 模式下不需要全量保存')
}

export async function addBudget(budget: Budget): Promise<void> {
  const uid = getUserId()
  if (!uid) return
  const { error } = await supabase.from('budgets').upsert({
    id: budget.id,
    user_id: uid,
    category_id: budget.categoryId,
    amount: budget.amount,
    month: budget.month,
  }, { onConflict: 'id' })
  if (error) console.error('addBudget error:', error)
}

export async function deleteBudget(id: string): Promise<void> {
  const uid = getUserId()
  if (!uid) return
  const { error } = await supabase.from('budgets').delete().eq('id', id).eq('user_id', uid)
  if (error) console.error('deleteBudget error:', error)
}

// ===== 数据导出 =====

export async function exportData() {
  const [records, categories, accounts, budgets] = await Promise.all([
    getRecords(),
    getCategories(),
    getAccounts(),
    getBudgets(),
  ])
  return {
    records,
    categories,
    accounts,
    budgets,
    exportDate: new Date().toISOString(),
  }
}

export async function importData(data: { records?: Record[]; categories?: Category[]; accounts?: Account[]; budgets?: Budget[] }) {
  const uid = getUserId()
  if (!uid) return

  if (data.categories?.length) {
    await supabase.from('categories').upsert(
      data.categories.map(c => ({
        id: c.id, user_id: uid, name: c.name, icon: c.icon, type: c.type, is_default: c.isDefault,
      })),
      { onConflict: 'id' }
    )
  }
  if (data.accounts?.length) {
    await supabase.from('accounts').upsert(
      data.accounts.map(a => ({
        id: a.id, user_id: uid, name: a.name, icon: a.icon, balance: a.balance, is_default: a.isDefault,
      })),
      { onConflict: 'id' }
    )
  }
  if (data.records?.length) {
    await supabase.from('records').upsert(
      data.records.map(r => ({
        id: r.id, user_id: uid, type: r.type, amount: r.amount,
        original_amount: r.originalAmount ?? null, currency: r.currency,
        category_id: r.categoryId, note: r.note, date: r.date,
        created_at: r.createdAt, tags: r.tags, account_id: r.accountId,
      })),
      { onConflict: 'id' }
    )
  }
  if (data.budgets?.length) {
    await supabase.from('budgets').upsert(
      data.budgets.map(b => ({
        id: b.id, user_id: uid, category_id: b.categoryId, amount: b.amount, month: b.month,
      })),
      { onConflict: 'id' }
    )
  }
}

// ===== 行转换函数 =====

function rowToRecord(row: any): Record {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    originalAmount: row.original_amount ? Number(row.original_amount) : undefined,
    currency: row.currency,
    categoryId: row.category_id,
    note: row.note || '',
    date: row.date,
    createdAt: row.created_at,
    tags: row.tags || [],
    accountId: row.account_id,
  }
}

function rowToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    type: row.type,
    isDefault: row.is_default,
  }
}

function rowToAccount(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    balance: Number(row.balance),
    isDefault: row.is_default,
  }
}

function rowToBudget(row: any): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    amount: Number(row.amount),
    month: row.month,
  }
}
