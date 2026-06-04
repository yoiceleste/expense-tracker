<template>
  <div class="settle-page">
    <div class="detail-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <span class="header-title">结算方案</span>
      <span style="width:34px"></span>
    </div>

    <!-- 概览 -->
    <div class="summary-card">
      <div class="summary-total">{{ formatCurrencyTotals(totalByCurrency) }}</div>
      <div v-if="totalCny > 0" class="summary-sub">人民币结算层 ≈ ¥{{ formatMoney(totalCny) }} CNY</div>
      <div class="summary-sub">最优转账方案，共 {{ transfers.length }} 笔</div>
    </div>

    <!-- 各人余额 -->
    <div class="section-title">收支明细</div>
    <div class="balance-list">
      <div v-for="b in balances" :key="b.memberId" class="balance-item">
        <div class="balance-left">
          <span class="balance-avatar" :style="{ background: b.color }">{{ b.name[0] }}</span>
          <span class="balance-name">{{ b.name }}</span>
        </div>
        <div class="balance-right">
          <div class="balance-detail">
            <span class="paid">付 {{ currencySymbol }}{{ formatMoney(b.paid) }}</span>
            <span class="share">摊 {{ currencySymbol }}{{ formatMoney(b.share) }}</span>
          </div>
          <div class="balance-net" :class="{ positive: b.balance > 0, negative: b.balance < 0 }">
            {{ b.balance > 0 ? '+' : '' }}{{ currencySymbol }}{{ formatMoney(b.balance) }}
          </div>
          <div class="balance-cny">≈ ¥{{ formatMoney(b.balanceCny) }} CNY</div>
        </div>
      </div>
    </div>

    <!-- 转账方案 -->
    <div class="section-title-row">
      <span class="section-title">转账方案</span>
      <button v-if="transfers.length > 0" class="copy-btn" @click="copySettlement">
        📋 复制
      </button>
    </div>

    <div v-if="transfers.length === 0" class="settle-done">
      <div class="done-icon">🎉</div>
      <div class="done-text">已经两清了，无需转账</div>
    </div>

    <div v-for="(t, i) in transfers" :key="i" class="transfer-card">
      <div class="transfer-line">
        <div class="transfer-person from">
          <span class="tp-avatar" :style="{ background: getColor(t.fromId) }">
            {{ getName(t.fromId)[0] }}
          </span>
          <span class="tp-name">{{ getName(t.fromId) }}</span>
        </div>
        <div class="transfer-arrow">
          <span class="arrow-amount">{{ getCurrencyInfo(t.currency).symbol }}{{ formatMoney(t.amount) }} {{ t.currency }}</span>
          <span v-if="t.cnyAmount > 0" class="arrow-cny">≈ ¥{{ formatMoney(t.cnyAmount) }} CNY</span>
          <span class="arrow-icon">→</span>
        </div>
        <div class="transfer-person to">
          <span class="tp-avatar" :style="{ background: getColor(t.toId) }">
            {{ getName(t.toId)[0] }}
          </span>
          <span class="tp-name">{{ getName(t.toId) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTripStore } from '../../stores/trip'
import { formatMoney } from '../../utils/trip-storage'
import { getCurrencyInfo } from '../../types/currencies'

const route = useRoute()
const store = useTripStore()
const tripId = route.params.id as string

const trip = computed(() => store.getTripById(tripId))
const currencyInfo = computed(() => getCurrencyInfo(trip.value?.currency || 'CNY'))
const isForeignCurrency = computed(() => trip.value?.currency !== 'CNY')
const currencySymbol = computed(() => isForeignCurrency.value ? currencyInfo.value.symbol : '¥')
const totalByCurrency = computed(() => trip.value ? store.getTripTotalsByCurrency(trip.value) : {})
const totalCny = computed(() => trip.value ? store.getTripTotalCny(trip.value) : 0)
const balances = computed(() => trip.value ? store.getMemberBalances(trip.value) : [])
const transfers = computed(() => trip.value ? store.getTransfers(trip.value) : [])

onMounted(async () => {
  await store.loadExchangeRates()
})

function formatAmount(amount: number, currency: string): string {
  return `${getCurrencyInfo(currency).symbol}${formatMoney(amount)} ${currency}`
}

function formatCurrencyTotals(totals: Record<string, number>): string {
  const entries = Object.entries(totals)
  if (entries.length === 0) return '¥0.00 CNY'
  return entries.map(([currency, amount]) => formatAmount(amount, currency)).join(' / ')
}

function getName(id: string) {
  return trip.value ? store.getMemberName(trip.value, id) : '?'
}

function getColor(id: string) {
  return trip.value ? store.getMemberColor(trip.value, id) : '#ccc'
}

function copySettlement() {
  if (!trip.value || transfers.value.length === 0) return
  const lines = transfers.value.map((t, i) => {
    const from = getName(t.fromId)
    const to = getName(t.toId)
    if (t.cnyAmount > 0) {
      return `${i + 1}. ${from} → ${to}：${getCurrencyInfo(t.currency).symbol}${formatMoney(t.amount)} ${t.currency}（≈ ¥${formatMoney(t.cnyAmount)} CNY）`
    }
    return `${i + 1}. ${from} → ${to}：${getCurrencyInfo(t.currency).symbol}${formatMoney(t.amount)} ${t.currency}`
  })
  let header = `【${trip.value.name} 结算方案】\n总消费：${formatCurrencyTotals(totalByCurrency.value)}`
  if (totalCny.value > 0) {
    header += `（人民币结算层 ≈ ¥${formatMoney(totalCny.value)} CNY）`
  }
  const text = `${header}\n\n${lines.join('\n')}`
  navigator.clipboard.writeText(text).then(() => {
    alert('已复制到剪贴板！可以直接发给群聊')
  }).catch(() => {
    const input = document.createElement('textarea')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    alert('已复制到剪贴板！可以直接发给群聊')
  })
}
</script>

<style scoped>
.settle-page {
  padding: 0 16px 40px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}

.back-btn {
  width: 34px;
  height: 34px;
  border: none;
  background: var(--card-bg);
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.header-title {
  font-size: 17px;
  font-weight: 600;
}

/* 概览 */
.summary-card {
  text-align: center;
  padding: 24px;
  background: var(--card-bg);
  border-radius: 14px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.summary-total {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.summary-sub {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 余额列表 */
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.copy-btn {
  padding: 6px 14px;
  border: none;
  background: var(--primary);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.balance-list {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 4px 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.balance-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.balance-item:last-child {
  border-bottom: none;
}

.balance-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.balance-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: white;
}

.balance-name {
  font-size: 15px;
  font-weight: 500;
}

.balance-right {
  text-align: right;
}

.balance-detail {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.balance-detail .paid {
  margin-right: 8px;
}

.balance-net {
  font-size: 16px;
  font-weight: 700;
}

.balance-net.positive {
  color: var(--income);
}

.balance-net.negative {
  color: var(--expense);
}

.balance-cny {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 转账卡片 */
.transfer-card {
  background: var(--card-bg);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.transfer-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.transfer-person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.tp-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.tp-name {
  font-size: 13px;
  font-weight: 500;
}

.transfer-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.arrow-amount {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
}

.arrow-cny {
  font-size: 12px;
  color: var(--text-secondary);
}

.arrow-icon {
  font-size: 20px;
  color: var(--text-secondary);
}

/* 已结清 */
.settle-done {
  text-align: center;
  padding: 40px 20px;
  background: var(--card-bg);
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.done-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.done-text {
  font-size: 15px;
  color: var(--text-secondary);
}
</style>
