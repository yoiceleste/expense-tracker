import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Trip, TripExpense, TripMember, Transfer, MemberBalance, MemberSpending } from '../types/trip'
import { defaultTripCategories } from '../types/trip-defaults'
import * as storage from '../utils/trip-storage'

export const useTripStore = defineStore('trip', () => {
  const trips = ref<Trip[]>([])
  const categories = ref(defaultTripCategories)

  // 当前用户的 member_id（按 trip 缓存）
  const currentMemberIds = ref<Record<string, string>>({})

  // 初始化
  async function init() {
    trips.value = await storage.getTrips()
  }

  // 获取当前用户在某个旅行中的 member_id
  function getMyMemberId(tripId: string): string | null {
    if (currentMemberIds.value[tripId]) return currentMemberIds.value[tripId]
    const localId = storage.getLocalMemberId(tripId)
    if (localId) currentMemberIds.value[tripId] = localId
    return localId
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
    }
    return trip
  }

  // 通过分享码加入
  async function joinByShareCode(shareCode: string, nickname: string): Promise<Trip | null> {
    const trip = await storage.getTripByShareCode(shareCode)
    if (!trip) return null
    // 检查是否已加入
    const existingMemberId = storage.getLocalMemberId(trip.id)
    if (existingMemberId) {
      // 已加入，直接加载
      await loadTripById(trip.id)
      return trip
    }
    // 加入旅行
    await joinTrip(trip.id, nickname)
    await loadTripById(trip.id)
    return trip
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

  function getTransfers(trip: Trip): Transfer[] {
    const balances = getMemberBalances(trip)
    const transfers: Transfer[] = []

    const creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b })).sort((a, b) => b.balance - a.balance)
    const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b, balance: Math.abs(b.balance) })).sort((a, b) => b.balance - a.balance)

    let i = 0, j = 0
    while (i < creditors.length && j < debtors.length) {
      const amount = Math.min(creditors[i].balance, debtors[j].balance)
      if (amount > 0.01) {
        transfers.push({ fromId: debtors[j].memberId, toId: creditors[i].memberId, amount: Math.round(amount * 100) / 100 })
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
        if (!expense.splitAmong.includes(member.id)) return
        let perPerson: number
        if (expense.splitMode === 'custom' && expense.splitAmounts) {
          perPerson = expense.splitAmounts[member.id] || 0
        } else {
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
    getMyMemberId, hasJoined, joinTrip, joinByShareCode, getShareLink, loadTripById,
    createTrip, addMember, removeMember, renameMember, updateTrip, removeTrip, getTripById,
    addExpense, updateExpense, removeExpense,
    getMemberBalances, getTransfers, getMemberSpending,
    getMemberName, getMemberColor, getTripTotal,
  }
})
