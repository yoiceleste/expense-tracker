import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Trip, TripExpense, TripMember, Transfer, MemberBalance, MemberSpending } from '../types/trip'
import { defaultTripCategories } from '../types/trip-defaults'
import * as storage from '../utils/trip-storage'
import { supabase } from '../lib/supabase'
import { convertFromCNY, convertToCNY, fetchRates } from '../utils/exchange-rate'
import { calculateTripTransfers } from '../utils/trip-settlement'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const useTripStore = defineStore('trip', () => {
  const trips = ref<Trip[]>([])
  const categories = ref(defaultTripCategories)

  // 当前用户的 member_id（按 trip 缓存）
  const currentMemberIds = ref<Record<string, string>>({})

  // Realtime 订阅管理
  const channels = ref<Record<string, RealtimeChannel>>({})

  // 手动汇率覆盖：保存为 1 外币 = x CNY
  const MANUAL_RATE_KEY = 'trip_manual_exchange_rates_cny'

  function getManualRateOverrides(): Record<string, number> {
    try {
      return JSON.parse(localStorage.getItem(MANUAL_RATE_KEY) || '{}')
    } catch {
      return {}
    }
  }

  function saveManualRateOverrides(rates: Record<string, number>) {
    localStorage.setItem(MANUAL_RATE_KEY, JSON.stringify(rates))
  }

  function applyManualRateOverrides(rates: Record<string, number>): Record<string, number> {
    const merged = { ...rates }
    Object.entries(getManualRateOverrides()).forEach(([currency, cnyRate]) => {
      if (currency !== 'CNY' && cnyRate > 0) merged[currency] = 1 / cnyRate
    })
    return merged
  }

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

  // 获取当前用户在某个旅行中的 member_id。
  // localStorage 只是绑定缓存；旅行 members 才是身份是否仍然存在的真实数据来源。
  function getMyMemberId(tripId: string): string | null {
    const cachedId = currentMemberIds.value[tripId] || storage.getLocalMemberId(tripId)
    if (!cachedId) return null

    const trip = trips.value.find(item => item.id === tripId)
    if (trip && !trip.members.some(member => member.id === cachedId)) {
      storage.removeLocalMemberId(tripId)
      delete currentMemberIds.value[tripId]
      return null
    }

    currentMemberIds.value[tripId] = cachedId
    return cachedId
  }

  // 从旅行已有成员中重新选择身份，并恢复本地绑定。
  function bindMemberIdentity(tripId: string, memberId: string): boolean {
    const trip = trips.value.find(item => item.id === tripId)
    if (!trip?.members.some(member => member.id === memberId)) return false
    storage.setLocalMemberId(tripId, memberId)
    currentMemberIds.value[tripId] = memberId
    return true
  }

  function clearMemberIdentity(tripId: string): void {
    storage.removeLocalMemberId(tripId)
    delete currentMemberIds.value[tripId]
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
    const removingCurrentIdentity = getMyMemberId(tripId) === memberId
    trip.members = trip.members.filter(m => m.id !== memberId)
    trip.updatedAt = Date.now()
    await storage.deleteMember(tripId, memberId)
    await storage.saveTrip(trip)
    if (removingCurrentIdentity) clearMemberIdentity(tripId)
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
      paidCny: 0,
      shareCny: 0,
      balanceCny: 0,
    }))

    ratesVersion.value
    const settlementCurrency = trip.currency || 'CNY'

    trip.expenses.forEach(expense => {
      const expenseCurrency = getExpenseCurrency(expense, trip)
      const amountCny = toCnyAmount(expense.amount, expenseCurrency)
      const payer = balances.find(b => b.memberId === expense.payerId)
      if (payer) payer.paidCny += amountCny

      const selectedParticipants = expense.splitAmong.filter(memberId =>
        balances.some(b => b.memberId === memberId)
      )

      if (expense.splitMode === 'custom' && expense.splitAmounts) {
        selectedParticipants.forEach(memberId => {
          const member = balances.find(b => b.memberId === memberId)
          const shareAmount = expense.splitAmounts[memberId] || 0
          if (member) member.shareCny += toCnyAmount(shareAmount, expenseCurrency)
        })
      } else {
        const splitCount = selectedParticipants.length
        if (splitCount > 0) {
          const perPersonCny = amountCny / splitCount
          selectedParticipants.forEach(memberId => {
            const member = balances.find(b => b.memberId === memberId)
            if (member) member.shareCny += perPersonCny
          })
        }
      }
    })

    balances.forEach(b => {
      b.balanceCny = b.paidCny - b.shareCny
      b.paid = roundMoney(fromCnyAmount(b.paidCny, settlementCurrency))
      b.share = roundMoney(fromCnyAmount(b.shareCny, settlementCurrency))
      b.balance = roundMoney(fromCnyAmount(b.balanceCny, settlementCurrency))
      b.paidCny = roundMoney(b.paidCny)
      b.shareCny = roundMoney(b.shareCny)
      b.balanceCny = roundMoney(b.balanceCny)
    })
    return balances
  }

  // 汇率缓存（用于结算时计算人民币等值）
  const cachedRates = ref<Record<string, number> | null>(null)
  const ratesVersion = ref(0)

  async function loadExchangeRates(): Promise<Record<string, number>> {
    if (cachedRates.value) return cachedRates.value
    try {
      const data = await fetchRates()
      cachedRates.value = applyManualRateOverrides(data.rates)
      ratesVersion.value++
      return cachedRates.value
    } catch {
      return {}
    }
  }

  async function setManualExchangeRate(currency: string, cnyRate: number): Promise<void> {
    if (currency === 'CNY' || cnyRate <= 0) return
    const overrides = getManualRateOverrides()
    overrides[currency] = cnyRate
    saveManualRateOverrides(overrides)
    if (!cachedRates.value) await loadExchangeRates()
    cachedRates.value = applyManualRateOverrides(cachedRates.value || { CNY: 1 })
    ratesVersion.value++
  }

  function getManualExchangeRate(currency: string): number | null {
    const rate = getManualRateOverrides()[currency]
    return rate && rate > 0 ? rate : null
  }

  function getCnyRate(currency: string): number | null {
    if (currency === 'CNY') return 1
    const manualRate = getManualExchangeRate(currency)
    if (manualRate) return manualRate
    ratesVersion.value
    const rate = cachedRates.value?.[currency]
    return rate ? 1 / rate : null
  }

  function getExpenseCurrency(expense: TripExpense, trip: Trip): string {
    return expense.currency || trip.currency || 'CNY'
  }

  function toCnyAmount(amount: number, currency: string): number {
    if (currency === 'CNY') return amount
    return cachedRates.value ? convertToCNY(amount, currency, cachedRates.value) : amount
  }

  function fromCnyAmount(amount: number, currency: string): number {
    if (currency === 'CNY') return amount
    return cachedRates.value ? convertFromCNY(amount, currency, cachedRates.value) : amount
  }

  function roundMoney(amount: number): number {
    return Math.round(amount * 100) / 100
  }

  function getTransfers(trip: Trip): Transfer[] {
    ratesVersion.value
    return calculateTripTransfers(trip, {
      getExpenseCurrency,
      toCnyAmount,
    })
  }

  function getMemberSpending(trip: Trip): MemberSpending[] {
    return trip.members.map(member => {
      const catMap = new Map<string, number>()
      trip.expenses.forEach(expense => {
        let perPerson: number
        if (expense.splitMode === 'custom' && expense.splitAmounts) {
          // 自定义模式：只有被选中的 splitAmong 成员才参与
          if (!expense.splitAmong.includes(member.id)) return
          perPerson = expense.splitAmounts[member.id] || 0
        } else {
          // 均摊模式：只有 splitAmong 中的成员才参与
          if (!expense.splitAmong.includes(member.id) || expense.splitAmong.length === 0) return
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
    return trip.expenses
      .filter(e => getExpenseCurrency(e, trip) === trip.currency)
      .reduce((s, e) => s + e.amount, 0)
  }

  function getTripTotalCny(trip: Trip) {
    ratesVersion.value
    return roundMoney(trip.expenses.reduce((s, e) => s + toCnyAmount(e.amount, getExpenseCurrency(e, trip)), 0))
  }

  function getTripTotalsByCurrency(trip: Trip) {
    const totals: Record<string, number> = {}
    trip.expenses.forEach(e => {
      const currency = getExpenseCurrency(e, trip)
      totals[currency] = (totals[currency] || 0) + e.amount
    })
    return Object.fromEntries(Object.entries(totals).map(([currency, amount]) => [currency, roundMoney(amount)]))
  }

  return {
    trips, categories, currentMemberIds,
    init,
    getMyMemberId, bindMemberIdentity, clearMemberIdentity, hasJoined, joinTrip, findByShareCode, getShareLink, loadTripById,
    subscribeTrip, unsubscribeTrip,
    createTrip, addMember, removeMember, renameMember, updateTrip, removeTrip, getTripById,
    addExpense, updateExpense, removeExpense,
    getMemberBalances, getTransfers, getMemberSpending,
    getMemberName, getMemberColor, getTripTotal, getTripTotalCny, getTripTotalsByCurrency, getExpenseCurrency,
    loadExchangeRates, setManualExchangeRate, getManualExchangeRate, getCnyRate,
  }
})
