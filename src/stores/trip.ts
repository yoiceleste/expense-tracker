import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Trip, TripExpense, TripMember, Transfer, MemberBalance, MemberSpending } from '../types/trip'
import { defaultTripCategories } from '../types/trip-defaults'
import * as storage from '../utils/trip-storage'
import { supabase } from '../lib/supabase'
import { convertToCNY } from '../utils/exchange-rate'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const useTripStore = defineStore('trip', () => {
  const trips = ref<Trip[]>([])
  const categories = ref(defaultTripCategories)

  // 当前用户的 member_id（按 trip 缓存）
  const currentMemberIds = ref<Record<string, string>>({})

  // Realtime 订阅管理
  const channels = ref<Record<string, RealtimeChannel>>({})

  // 初始化 - 只加载用户已加入的旅行
  async function init() {
    const joinedTripIds = storage.getAllJoinedTripIds()
    const loadedTrips: Trip[] = []
    for (const tripId of joinedTripIds) {
      const trip = await loadTripById(tripId)
      if (trip) loadedTrips.push(trip)
    }
    trips.value = loadedTrips
  }

  // 获取当前用户在某个旅行中的 member_id
  function getMyMemberId(tripId: string): string | null {
    if (currentMemberIds.value[tripId]) return currentMemberIds.value[tripId]
    const localId = storage.getLocalMemberId(tripId)
    if (localId) currentMemberIds.value[tripId] = localId
    return localId
  }

  // ===== Realtime 实时订阅 =====
  function subscribeTrip(tripId: string) {
    if (channels.value[tripId]) return // 已订阅

    const channel = supabase
      .channel(`trip-${tripId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'trip_expenses', filter: `trip_id=eq.${tripId}` },
        async () => {
          // 有新的消费记录变化，重新加载该旅行
          await loadTripById(tripId)
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` },
        async () => {
          // 有新成员变化，重新加载
          await loadTripById(tripId)
        }
      )
      .subscribe()

    channels.value[tripId] = channel
  }

  function unsubscribeTrip(tripId: string) {
    if (channels.value[tripId]) {
      supabase.removeChannel(channels.value[tripId])
      delete channels.value[tripId]
    }
  }

  // ===== 旅行 CRUD =====
  async function createTrip(name: string, currency: string = 'CNY', startDate: string = '', endDate: string = ''): Promise<Trip> {
    const trip: Trip = {
      id: storage.generateId(),
      name,
      currency,
      startDate,
      endDate,
      shareCode: storage.generateShareCode(),
      members: [],
      expenses: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    trips.value.unshift(trip)
    await storage.saveTrip(trip)
    return trip
  }

  // ===== 成员管理 =====
  const memberColors = ['#4f6ef7', '#f5584e', '#52c41a', '#faad14', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']

  async function addMember(tripId: string, name: string): Promise<TripMember | null> {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip) return null
    const member: TripMember = {
      id: storage.generateId(),
      name,
      color: memberColors[trip.members.length % memberColors.length],
    }
    trip.members.push(member)
    trip.updatedAt = Date.now()
    await storage.saveMember(tripId, member)
    await storage.saveTrip(trip)
    return member
  }

  // 加入旅行（输入昵称 → 创建成员 → 保存到 localStorage）
  async function joinTrip(tripId: string, nickname: string): Promise<TripMember | null> {
    const member = await addMember(tripId, nickname)
    if (member) {
      storage.setLocalMemberId(tripId, member.id)
      currentMemberIds.value[tripId] = member.id
    }
    return member
  }

  // 检查是否已加入某个旅行
  function hasJoined(tripId: string): boolean {
    return !!getMyMemberId(tripId)
  }

  async function removeMember(tripId: string, memberId: string) {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip) return
    const hasExpenses = trip.expenses.some(e => e.payerId === memberId || e.splitAmong.includes(memberId))
    if (hasExpenses) return false
    trip.members = trip.members.filter(m => m.id !== memberId)
    trip.updatedAt = Date.now()
    await storage.deleteMember(tripId, memberId)
    await storage.saveTrip(trip)
    return true
  }

  async function renameMember(tripId: string, memberId: string, newName: string) {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip) return
    const member = trip.members.find(m => m.id === memberId)
    if (member) {
      member.name = newName
      trip.updatedAt = Date.now()
      await storage.saveMember(tripId, member)
      await storage.saveTrip(trip)
    }
  }

  async function updateTrip(trip: Trip) {
    trip.updatedAt = Date.now()
    const index = trips.value.findIndex(t => t.id === trip.id)
    if (index !== -1) trips.value[index] = trip
    await storage.saveTrip(trip)
  }

  async function removeTrip(id: string) {
    trips.value = trips.value.filter(t => t.id !== id)
    unsubscribeTrip(id)
    await storage.deleteTrip(id)
  }

  function getTripById(id: string): Trip | undefined {
    return trips.value.find(t => t.id === id)
  }

  // 加载单个旅行数据（用于直接通过链接进入）
  async function loadTripById(tripId: string): Promise<Trip | null> {
    const trip = await storage.getTripById(tripId)
    if (trip) {
      const index = trips.value.findIndex(t => t.id === tripId)
      if (index !== -1) {
        trips.value[index] = trip
      } else {
        trips.value.unshift(trip)
      }
      // 自动订阅实时更新
      subscribeTrip(tripId)
    }
    return trip
  }

  // 通过分享码查找旅行（不加入）
  async function findByShareCode(shareCode: string): Promise<Trip | null> {
    return await storage.getTripByShareCode(shareCode)
  }

  // 获取分享链接
  function getShareLink(trip: Trip): string {
    const base = window.location.origin + window.location.pathname
    return `${base}#/join/${trip.shareCode}`
  }

  // ===== 消费记录 =====
  async function addExpense(tripId: string, data: Omit<TripExpense, 'id' | 'tripId' | 'createdAt'>) {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip) return

    const expense: TripExpense = {
      ...data,
      id: storage.generateId(),
      tripId,
      createdAt: Date.now(),
    }
    trip.expenses.unshift(expense)
    trip.updatedAt = Date.now()
    await storage.saveExpense(tripId, expense)
    await storage.saveTrip(trip)
    return expense
  }

  async function updateExpense(tripId: string, expenseId: string, data: Partial<TripExpense>) {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip) return
    const index = trip.expenses.findIndex(e => e.id === expenseId)
    if (index !== -1) {
      trip.expenses[index] = { ...trip.expenses[index], ...data }
      trip.updatedAt = Date.now()
      await storage.saveExpense(tripId, trip.expenses[index])
      await storage.saveTrip(trip)
    }
  }

  async function removeExpense(tripId: string, expenseId: string) {
    const trip = trips.value.find(t => t.id === tripId)
    if (!trip) return
    trip.expenses = trip.expenses.filter(e => e.id !== expenseId)
    trip.updatedAt = Date.now()
    await storage.deleteExpense(tripId, expenseId)
    await storage.saveTrip(trip)
  }

  // ===== 核心算法 =====
  function getMemberBalances(trip: Trip): MemberBalance[] {
    const balances: MemberBalance[] = trip.members.map(m => ({
      memberId: m.id,
      name: m.name,
      color: m.color,
      paid: 0,
      share: 0,
      balance: 0,
    }))

    trip.expenses.forEach(expense => {
      const payer = balances.find(b => b.memberId === expense.payerId)
      if (payer) payer.paid += expense.amount

      if (expense.splitMode === 'custom' && expense.splitAmounts) {
        Object.entries(expense.splitAmounts).forEach(([memberId, amount]) => {
          const member = balances.find(b => b.memberId === memberId)
          if (member) member.share += amount
        })
      } else {
        const splitCount = expense.splitAmong.length
        if (splitCount > 0) {
          const perPerson = expense.amount / splitCount
          expense.splitAmong.forEach(memberId => {
            const member = balances.find(b => b.memberId === memberId)
            if (member) member.share += perPerson
          })
        }
      }
    })

    balances.forEach(b => { b.balance = b.paid - b.share })
    return balances
  }

  // 汇率缓存（用于结算时计算人民币等值）
  let cachedRates: Record<string, number> | null = null

  async function loadExchangeRates(): Promise<Record<string, number>> {
    if (cachedRates) return cachedRates
    try {
      const { fetchRates } = await import('../utils/exchange-rate')
      const data = await fetchRates()
      cachedRates = data.rates
      return cachedRates
    } catch {
      return {}
    }
  }

  function getTransfers(trip: Trip): Transfer[] {
    const balances = getMemberBalances(trip)
    const transfers: Transfer[] = []

    const creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b })).sort((a, b) => b.balance - a.balance)
    const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b, balance: Math.abs(b.balance) })).sort((a, b) => b.balance - a.balance)

    let i = 0, j = 0
    while (i < creditors.length && j < debtors.length) {
      const amount = Math.min(creditors[i].balance, debtors[j].balance)
      if (amount > 0.01) {
        const roundedAmount = Math.round(amount * 100) / 100
        let cnyAmount = 0
        if (trip.currency !== 'CNY' && cachedRates) {
          cnyAmount = Math.round(convertToCNY(roundedAmount, trip.currency, cachedRates) * 100) / 100
        }
        transfers.push({ fromId: debtors[j].memberId, toId: creditors[i].memberId, amount: roundedAmount, cnyAmount })
      }
      creditors[i].balance -= amount
      debtors[j].balance -= amount
      if (creditors[i].balance < 0.01) i++
      if (debtors[j].balance < 0.01) j++
    }
    return transfers
  }

  function getMemberSpending(trip: Trip): MemberSpending[] {
    return trip.members.map(member => {
      const catMap = new Map<string, number>()
      trip.expenses.forEach(expense => {
        let perPerson: number
        if (expense.splitMode === 'custom' && expense.splitAmounts) {
          // 自定义模式：只有 splitAmounts 中有记录的成员才参与
          if (!(member.id in expense.splitAmounts)) return
          perPerson = expense.splitAmounts[member.id] || 0
        } else {
          // 均摊模式：只有 splitAmong 中的成员才参与
          if (!expense.splitAmong.includes(member.id)) return
          perPerson = expense.amount / expense.splitAmong.length
        }
        const current = catMap.get(expense.categoryId) || 0
        catMap.set(expense.categoryId, current + perPerson)
      })

      let total = 0
      const cats = Array.from(catMap.entries()).map(([catId, amount]) => {
        total += amount
        const cat = categories.value.find(c => c.id === catId)
        return { categoryId: catId, categoryName: cat?.name || '未知', categoryIcon: cat?.icon || '📦', amount: Math.round(amount * 100) / 100 }
      }).sort((a, b) => b.amount - a.amount)

      return { memberId: member.id, name: member.name, color: member.color, categories: cats, total: Math.round(total * 100) / 100 }
    })
  }

  function getMemberName(trip: Trip, memberId: string) {
    return trip.members.find(m => m.id === memberId)?.name || '未知'
  }

  function getMemberColor(trip: Trip, memberId: string) {
    return trip.members.find(m => m.id === memberId)?.color || '#ccc'
  }

  function getTripTotal(trip: Trip) {
    return trip.expenses.reduce((s, e) => s + e.amount, 0)
  }

  return {
    trips, categories, currentMemberIds,
    init,
    getMyMemberId, hasJoined, joinTrip, findByShareCode, getShareLink, loadTripById,
    subscribeTrip, unsubscribeTrip,
    createTrip, addMember, removeMember, renameMember, updateTrip, removeTrip, getTripById,
    addExpense, updateExpense, removeExpense,
    getMemberBalances, getTransfers, getMemberSpending,
    getMemberName, getMemberColor, getTripTotal,
    loadExchangeRates,
  }
})
