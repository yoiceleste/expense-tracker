/**
 * 旅行分账云存储层 - Supabase 实现
 */
import { supabase } from '../lib/supabase'
import { getUserId } from '../lib/auth'
import type { Trip, TripMember, TripExpense } from '../types/trip'

// ===== 工具函数 =====

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

export function formatMoney(amount: number): string {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// ===== 旅行 CRUD =====

export async function getTrips(): Promise<Trip[]> {
  const uid = getUserId()
  if (!uid) return []
  const { data: tripRows, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
  if (error) { console.error('getTrips error:', error); return [] }
  if (!tripRows?.length) return []

  // 批量获取所有成员和消费记录
  const tripIds = tripRows.map(t => t.id)
  const { data: memberRows } = await supabase
    .from('trip_members')
    .select('*')
    .in('trip_id', tripIds)
  const { data: expenseRows } = await supabase
    .from('trip_expenses')
    .select('*')
    .in('trip_id', tripIds)

  const membersByTrip = groupBy(memberRows || [], 'trip_id')
  const expensesByTrip = groupBy(expenseRows || [], 'trip_id')

  return tripRows.map(row => ({
    id: row.id,
    name: row.name,
    currency: row.currency,
    startDate: row.start_date,
    endDate: row.end_date,
    members: (membersByTrip[row.id] || []).map(rowToMember),
    expenses: (expensesByTrip[row.id] || []).map(rowToExpense),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function saveTrips(_trips: Trip[]): Promise<void> {
  console.warn('saveTrips: Supabase 模式下不需要全量保存')
}

export async function getTrip(id: string): Promise<Trip | undefined> {
  const trips = await getTrips()
  return trips.find(t => t.id === id)
}

export async function saveTrip(trip: Trip): Promise<void> {
  const uid = getUserId()
  if (!uid) { console.error('saveTrip: no user id'); return }
  const { error } = await supabase.from('trips').upsert({
    id: trip.id,
    user_id: uid,
    name: trip.name,
    currency: trip.currency,
    start_date: trip.startDate,
    end_date: trip.endDate,
    created_at: trip.createdAt,
    updated_at: trip.updatedAt,
  })
  if (error) console.error('saveTrip error:', error)
}

export async function deleteTrip(id: string): Promise<void> {
  const uid = getUserId()
  if (!uid) return
  // 由于有 ON DELETE CASCADE，删除 trip 会自动删除关联的 members 和 expenses
  await supabase.from('trips').delete().eq('id', id).eq('user_id', uid)
}

// ===== 成员操作 =====

export async function saveMember(tripId: string, member: TripMember): Promise<void> {
  const uid = getUserId()
  if (!uid) return
  await supabase.from('trip_members').upsert({
    id: member.id,
    trip_id: tripId,
    user_id: uid,
    name: member.name,
    color: member.color,
  }, { onConflict: 'trip_id,id' })
}

export async function deleteMember(tripId: string, memberId: string): Promise<void> {
  const uid = getUserId()
  if (!uid) return
  await supabase.from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('id', memberId)
    .eq('user_id', uid)
}

// ===== 消费记录操作 =====

export async function saveExpense(tripId: string, expense: TripExpense): Promise<void> {
  const uid = getUserId()
  if (!uid) return
  await supabase.from('trip_expenses').upsert({
    id: expense.id,
    trip_id: tripId,
    user_id: uid,
    payer_id: expense.payerId,
    amount: expense.amount,
    split_among: expense.splitAmong,
    split_mode: expense.splitMode,
    split_amounts: expense.splitAmounts,
    category_id: expense.categoryId,
    pay_method: expense.payMethod,
    images: expense.images,
    note: expense.note,
    date: expense.date,
    created_at: expense.createdAt,
  }, { onConflict: 'id,trip_id' })
}

export async function deleteExpense(tripId: string, expenseId: string): Promise<void> {
  const uid = getUserId()
  if (!uid) return
  await supabase.from('trip_expenses')
    .delete()
    .eq('trip_id', tripId)
    .eq('id', expenseId)
    .eq('user_id', uid)
}

// ===== 行转换函数 =====

function rowToMember(row: any): TripMember {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  }
}

function rowToExpense(row: any): TripExpense {
  return {
    id: row.id,
    tripId: row.trip_id,
    payerId: row.payer_id,
    amount: Number(row.amount),
    splitAmong: row.split_among || [],
    splitMode: row.split_mode,
    splitAmounts: row.split_amounts || {},
    categoryId: row.category_id,
    payMethod: row.pay_method || '',
    images: row.images || [],
    note: row.note || '',
    date: row.date,
    createdAt: row.created_at,
  }
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of arr) {
    const k = String(item[key])
    if (!result[k]) result[k] = []
    result[k].push(item)
  }
  return result
}
