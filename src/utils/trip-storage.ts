/**
 * 旅行分账云存储层 - 房间模式（无需登录）
 * 按 trip_id 访问数据，不依赖 auth user
 */
import { supabase } from '../lib/supabase'
import type { Trip, TripMember, TripExpense } from '../types/trip'

// ===== 工具函数 =====

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

export function generateShareCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export function formatMoney(amount: number): string {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// ===== localStorage 成员身份管理 =====

const MEMBER_KEY_PREFIX = 'trip_member_'

export function getLocalMemberId(tripId: string): string | null {
  return localStorage.getItem(MEMBER_KEY_PREFIX + tripId)
}

export function setLocalMemberId(tripId: string, memberId: string): void {
  localStorage.setItem(MEMBER_KEY_PREFIX + tripId, memberId)
}

export function removeLocalMemberId(tripId: string): void {
  localStorage.removeItem(MEMBER_KEY_PREFIX + tripId)
}

// ===== 旅行 CRUD =====

export async function getTrips(): Promise<Trip[]> {
  const { data: tripRows, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('getTrips error:', error); return [] }
  if (!tripRows?.length) return []

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
    shareCode: row.share_code,
    members: (membersByTrip[row.id] || []).map(rowToMember),
    expenses: (expensesByTrip[row.id] || []).map(rowToExpense),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function getTripByShareCode(shareCode: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('share_code', shareCode)
    .single()
  if (error || !data) return null

  const { data: memberRows } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', data.id)
  const { data: expenseRows } = await supabase
    .from('trip_expenses')
    .select('*')
    .eq('trip_id', data.id)

  return {
    id: data.id,
    name: data.name,
    currency: data.currency,
    startDate: data.start_date,
    endDate: data.end_date,
    shareCode: data.share_code,
    members: (memberRows || []).map(rowToMember),
    expenses: (expenseRows || []).map(rowToExpense),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function getTripById(tripId: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single()
  if (error || !data) return null

  const { data: memberRows } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
  const { data: expenseRows } = await supabase
    .from('trip_expenses')
    .select('*')
    .eq('trip_id', tripId)

  return {
    id: data.id,
    name: data.name,
    currency: data.currency,
    startDate: data.start_date,
    endDate: data.end_date,
    shareCode: data.share_code,
    members: (memberRows || []).map(rowToMember),
    expenses: (expenseRows || []).map(rowToExpense),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function saveTrip(trip: Trip): Promise<void> {
  const { error } = await supabase.from('trips').upsert({
    id: trip.id,
    name: trip.name,
    currency: trip.currency,
    start_date: trip.startDate,
    end_date: trip.endDate,
    share_code: trip.shareCode,
    created_at: trip.createdAt,
    updated_at: trip.updatedAt,
  })
  if (error) console.error('saveTrip error:', error)
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) console.error('deleteTrip error:', error)
}

// ===== 成员操作 =====

export async function saveMember(tripId: string, member: TripMember): Promise<void> {
  const { error } = await supabase.from('trip_members').upsert({
    id: member.id,
    trip_id: tripId,
    name: member.name,
    color: member.color,
  })
  if (error) console.error('saveMember error:', error)
}

export async function deleteMember(tripId: string, memberId: string): Promise<void> {
  const { error } = await supabase.from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('id', memberId)
  if (error) console.error('deleteMember error:', error)
}

// ===== 消费记录操作 =====

export async function saveExpense(tripId: string, expense: TripExpense): Promise<void> {
  const { error } = await supabase.from('trip_expenses').upsert({
    id: expense.id,
    trip_id: tripId,
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
  })
  if (error) console.error('saveExpense error:', error)
}

export async function deleteExpense(tripId: string, expenseId: string): Promise<void> {
  const { error } = await supabase.from('trip_expenses')
    .delete()
    .eq('trip_id', tripId)
    .eq('id', expenseId)
  if (error) console.error('deleteExpense error:', error)
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
